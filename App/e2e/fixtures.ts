/**
 * Shared ground for the journey test: who the two actors are, where they are,
 * and the direct database access the flow needs but the app deliberately does
 * not expose.
 *
 * Plain node imports only — Playwright compiles these with esbuild and none of
 * SvelteKit's `$lib` aliases exist here. Constants are imported from the real
 * source by relative path so the test moves when the product does.
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Playwright runs tests in worker processes of their own.
dotenv.config();

neonConfig.webSocketConstructor = ws;

/* ----------------------------------------------------------------- guards */

/**
 * The journey creates accounts and trips. Running it against the database the
 * app is deployed on would put test rows in front of real businesses, so it is
 * opt-in rather than opt-out, and the flag has to be set deliberately.
 */
export function assertDestructiveAllowed() {
  if (process.env.E2E_ALLOW_DESTRUCTIVE !== "1") {
    throw new Error(
      "The journey test writes to the database. Point DATABASE_URL at a " +
        "throwaway Neon branch and set E2E_ALLOW_DESTRUCTIVE=1 to run it.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
}

/** Where the app under test is served. Matches playwright.config's baseURL. */
export const APP_ORIGIN = process.env.E2E_BASE_URL ?? "http://localhost:4173";

/**
 * SvelteKit refuses a cross-site form POST, and Playwright's request context
 * sends no Origin header of its own — so a `?/signup` post arrives looking like
 * CSRF and is rejected before the action runs. This is what an actual browser
 * form submission would have sent.
 */
export const FORM_HEADERS = { origin: APP_ORIGIN };

/* -------------------------------------------------------------- identities */

/**
 * Every account this suite makes carries this prefix, which is what teardown
 * matches on. Anything not wearing it is somebody's real account.
 */
export const E2E_EMAIL_PREFIX = "yada-e2e-";

/** Unique per run, so two runs never collide on the unique email or phone. */
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/**
 * Ghanaian mobile numbers are nine significant digits and the column is unique,
 * so the run id is folded into the digits rather than the address alone.
 */
function runPhone(seed: number) {
  // The seed has to survive the truncation. It used to be prefixed and then
  // sliced off the front by `slice(-8)`, so both actors drew the same number
  // and the second sign-up died silently on the unique constraint.
  const stamp = `${Date.now()}`.slice(-7);
  return `02${seed}${stamp}`;
}

export const BUSINESS = {
  email: `${E2E_EMAIL_PREFIX}biz-${RUN}@example.test`,
  password: "e2e-password-1234",
  name: "E2E Test Kitchen",
  phone: runPhone(1),
  role: "business" as const,
};

/**
 * A 1×1 transparent PNG. Sign-up requires a courier photo (SRS 3.1: the
 * business is shown it on acceptance, so it is part of the account rather than
 * a decoration to fill in later) and the schema accepts only
 * `data:image/(png|jpeg|webp);base64,…`.
 */
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const COURIER = {
  email: `${E2E_EMAIL_PREFIX}rider-${RUN}@example.test`,
  password: "e2e-password-1234",
  name: "E2E Test Rider",
  phone: runPhone(2),
  plate: "GT 4521-20",
  image: TINY_PNG,
  role: "courier" as const,
};

/* --------------------------------------------------------------- geography */

/** The business counter. Inside the KNUST / Ayeduase service area. */
export const PICKUP = { lat: 6.6745, lng: -1.5716 };

/** Where the parcel is going — far enough to be a real trip, near enough to ring. */
export const DROPOFF = { lat: 6.6805, lng: -1.5652 };

const METRE_IN_DEGREES = 1 / 111_320;

/** A point `metres` due north of `origin`. */
export function north(origin: { lat: number; lng: number }, metres: number) {
  return { lat: origin.lat + metres * METRE_IN_DEGREES, lng: origin.lng };
}

/**
 * Distances chosen to sit well inside the handover gates without importing
 * them: `$lib/shared/geo/proximity` reaches the service-area polygon, and that
 * JSON import cannot cross Playwright's ESM loader.
 *
 * The gates are 15 m at the pickup and 31 m at the drop-off, and the exact
 * numbers are asserted in `src/lib/shared/geo/proximity.test.ts`. Five metres
 * stays inside either even if they are tightened; anything below that is under
 * the resolution of a phone fix and would not be a gate at all.
 */
const WELL_INSIDE_METRES = 5;

/** Comfortably inside the pickup gate, so the handover button appears. */
export const AT_PICKUP = north(PICKUP, WELL_INSIDE_METRES);

/** Comfortably inside the drop-off gate. */
export const AT_DROPOFF = north(DROPOFF, WELL_INSIDE_METRES);

/** Well outside both — where the rider starts, and still in the first ring. */
export const NEAR_PICKUP = north(PICKUP, 250);

/* ------------------------------------------------------- saved sessions */

const AUTH_DIR = path.join("e2e", ".auth");

export const STORAGE = {
  business: path.join(AUTH_DIR, "business.json"),
  courier: path.join(AUTH_DIR, "courier.json"),
};

export function ensureAuthDir() {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
}

/** The signed-in courier's cookie header, for driving POST /api/location. */
export function cookieHeaderFrom(storagePath: string) {
  const state = JSON.parse(readFileSync(storagePath, "utf8")) as {
    cookies: Array<{ name: string; value: string }>;
  };

  return state.cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

/* -------------------------------------------------------------- database */

async function withDb<T>(run: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return await run(pool);
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Email verification is a soft gate on exactly the two actions this journey
 * needs — sending a delivery, and going online — and there is no inbox to read
 * a link out of. Flipping the column is the only way through.
 */
export async function markEmailVerified(email: string) {
  assertDestructiveAllowed();

  await withDb(async (pool) => {
    const result = await pool.query(
      `update users set email_verified = true where email = $1`,
      [email],
    );

    if (result.rowCount !== 1) {
      throw new Error(
        `No account found for ${email}. A SvelteKit form action that fails ` +
          `validation re-renders the page, so the sign-up POST returns 200 ` +
          `either way — check the fields against signUpSchema.`,
      );
    }
  });
}

/** Both ratings for a trip, so the journey can assert they were written. */
export async function ratingsForTrip(tripId: string) {
  return withDb(async (pool) => {
    const result = await pool.query(
      `select rater_id, rated_id, stars from trip_ratings where trip_id = $1`,
      [tripId],
    );
    return result.rows as Array<{
      rater_id: string;
      rated_id: string;
      stars: number;
    }>;
  });
}

/** The stored status, for asserting a transition the UI only implies. */
export async function tripStatus(tripId: string) {
  return withDb(async (pool) => {
    const result = await pool.query(
      `select status from delivery_requests where id = $1`,
      [tripId],
    );
    return (result.rows[0]?.status as string | undefined) ?? null;
  });
}

/**
 * Remove everything this suite created. Matches on the email prefix, and the
 * foreign keys cascade the trips, events, declines and ratings with the users.
 */
export async function deleteE2EAccounts() {
  assertDestructiveAllowed();

  return withDb(async (pool) => {
    const result = await pool.query(`delete from users where email like $1`, [
      `${E2E_EMAIL_PREFIX}%`,
    ]);
    return result.rowCount ?? 0;
  });
}
