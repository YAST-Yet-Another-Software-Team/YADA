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
 */

const databaseUrl = env.DATABASE_URL ?? "";

type GlobalDbCache = typeof globalThis & {
  __yada_db__?: {
    pool: Pool;
    db: ReturnType<typeof drizzle>;
  };
};

if (
  !databaseUrl ||
  databaseUrl.includes("[user]") ||
  databaseUrl.includes("[password]")
) {
  throw new Error(
    "DATABASE_URL is not configured. Set it to your real Neon connection string before running Better Auth.",
  );
}

// Workers provides WebSocket natively; Node does not until v22, and the local
// Socket.IO server still runs on Node. The specifier is held in a variable so
// the bundler leaves it alone — `ws` must never be pulled into the Worker build.
if (typeof WebSocket === "undefined") {
  const wsSpecifier = "ws";
  neonConfig.webSocketConstructor = (
    await import(/* @vite-ignore */ wsSpecifier)
  ).default;
}

const globalDb = globalThis as GlobalDbCache;

if (!globalDb.__yada_db__) {
  const pool = new Pool({ connectionString: databaseUrl });

  globalDb.__yada_db__ = {
    pool,
    db: drizzle({ client: pool, schema }),
  };
}

export const databasePool = globalDb.__yada_db__.pool;
export const db = globalDb.__yada_db__.db;
