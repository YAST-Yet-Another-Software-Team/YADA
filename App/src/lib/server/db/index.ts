import { AsyncLocalStorage } from "node:async_hooks";

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { env } from "$env/dynamic/private";

import * as schema from "./schema";

/**
 * Neon's serverless driver speaks Postgres over WebSocket rather than raw TCP,
 * which Workers cannot open. It keeps interactive transactions — `ratings.ts`
 * writes a rating and the courier's cached average in one — so this is a drop-in
 * for `pg.Pool` rather than the HTTP driver, which would not.
 *
 * Use the Neon *pooled* connection string (the one containing `-pooler`).
 *
 * ---------------------------------------------------------------------------
 * Why the pool is not a plain module-level singleton
 * ---------------------------------------------------------------------------
 * A Worker isolate outlives the request that warmed it, so a pool cached on
 * `globalThis` hands request #2 a WebSocket that was opened inside request #1's
 * I/O context. Workers rejects that with "Cannot perform I/O on behalf of a
 * different request", and because the driver's reply never arrives the query
 * promise simply never settles — the runtime then kills the request as hung.
 * That is the pair of errors this module exists to prevent.
 *
 * So on Workers the pool is per-request: `withRequestDatabase` opens one, binds
 * it to an AsyncLocalStorage scope for the duration of the request, and closes
 * it once the response body has drained. Under `vite dev`, which runs on Node,
 * there is no such isolation and a long-lived pool is the right thing, so the
 * singleton is kept there.
 *
 * Callers see none of this: `db` is a proxy onto whichever connection is
 * currently in scope, so `import { db } from '$lib/server/db'` still works from
 * module scope — including Better Auth's `drizzleAdapter(db, …)`, which is
 * constructed once at startup and used across every request.
 */

const databaseUrl = env.DATABASE_URL ?? "";

if (
  !databaseUrl ||
  databaseUrl.includes("[user]") ||
  databaseUrl.includes("[password]")
) {
  throw new Error(
    "DATABASE_URL is not configured. Set it to your real Neon connection string before running Better Auth.",
  );
}

// Workers provides WebSocket natively; Node does not until v22, and `vite dev`
// runs on Node — which is why `ws` survives the move to a Workers-only
// deployment. The specifier is held in a variable so the bundler leaves it
// alone: `ws` must never be pulled into the Worker build.
if (typeof WebSocket === "undefined") {
  const wsSpecifier = "ws";
  neonConfig.webSocketConstructor = (
    await import(/* @vite-ignore */ wsSpecifier)
  ).default;
}

const onWorkers =
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

type Connection = {
  pool: Pool;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

export type Database = Connection["db"];

function createConnection(): Connection {
  const pool = new Pool({ connectionString: databaseUrl });

  return { pool, db: drizzle({ client: pool, schema }) };
}

const requestScope = new AsyncLocalStorage<Connection>();

type GlobalDbCache = typeof globalThis & { __yada_db__?: Connection };
const globalDb = globalThis as GlobalDbCache;

function activeConnection(): Connection {
  const scoped = requestScope.getStore();
  if (scoped) return scoped;

  if (onWorkers) {
    // Reaching for the singleton here is exactly the cross-request I/O bug, so
    // fail loudly instead: something is touching the database outside the
    // `handle` hook and needs its own `withRequestDatabase` wrapper.
    throw new Error(
      "No request-scoped database connection. Database access on Workers must run inside withRequestDatabase().",
    );
  }

  globalDb.__yada_db__ ??= createConnection();
  return globalDb.__yada_db__;
}

/**
 * Run a request inside its own database scope.
 *
 * `waitUntil` (the Workers `ExecutionContext` method, reachable in SvelteKit as
 * `event.platform.context.waitUntil`) keeps the isolate alive while the pool
 * shuts down after the response has been handed back.
 */
export async function withRequestDatabase(
  run: () => Promise<Response>,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response> {
  if (!onWorkers) return run();

  const connection = createConnection();
  const close = () => connection.pool.end().catch(() => {});

  let response: Response;
  try {
    response = await requestScope.run(connection, run);
  } catch (error) {
    void close();
    throw error;
  }

  // A `load` may stream, so the body can still be pulling rows after `resolve`
  // has returned. Close when it has drained, not before.
  if (!response.body) {
    const closed = close();
    if (waitUntil) waitUntil(closed);
    return response;
  }

  const relay = new TransformStream();
  const drained = response.body.pipeTo(relay.writable).then(close, close);
  if (waitUntil) waitUntil(drained);

  return new Response(relay.readable, response);
}

/**
 * The drizzle client for the request currently in scope.
 *
 * Property reads are forwarded on each access rather than captured once, which
 * is what lets a module-scope `import` outlive any single request's pool.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const target = activeConnection().db as unknown as Record<
      string | symbol,
      unknown
    >;
    const value = target[property];

    return typeof value === "function" ? value.bind(target) : value;
  },
  has(_target, property) {
    return property in (activeConnection().db as object);
  },
  ownKeys() {
    return Reflect.ownKeys(activeConnection().db as object);
  },
  getOwnPropertyDescriptor(_target, property) {
    const descriptor = Reflect.getOwnPropertyDescriptor(
      activeConnection().db as object,
      property,
    );

    // The proxy target is a bare `{}`, so every key it reports must look
    // configurable or the invariant check throws.
    return descriptor && { ...descriptor, configurable: true };
  },
});
