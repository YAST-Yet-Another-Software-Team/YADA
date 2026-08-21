import { json, type RequestEvent } from "@sveltejs/kit";

import { isUuid } from "$lib/shared/uuid";
import type { AuthRole, SessionUser } from "$lib/utils/types";

/**
 * The error envelope every `/api` route answers with: `ok` for the happy-path
 * check, `code` for programmatic handling, `message` for display.
 */
export function apiError(status: number, code: string, message: string) {
  return json({ ok: false, code, message }, { status });
}

/**
 * The refusal an unconfirmed email earns.
 *
 * Confirmation is a soft gate — it never blocks sign-in, and an unverified
 * account can read its whole workspace. What it blocks is the handful of
 * actions that reach other people: a delivery request that rings couriers, and
 * a courier making themselves available to be rung. Both are worth knowing an
 * address is real for.
 *
 * `action` is a gerund phrase: "sending a delivery", "going online".
 */
export function emailUnverified(action: string) {
  return apiError(
    403,
    "email_unverified",
    `Confirm your email before ${action}. Check your inbox for the link.`,
  );
}

const ROLE_REQUIRED: Record<AuthRole, string> = {
  business: "Business account required.",
  courier: "Courier account required.",
};

export type ApiRouteOptions = {
  /** Restrict to one workspace. Omitted means either role may call it. */
  role?: AuthRole;
  /**
   * Gate on a confirmed email, naming the action for the refusal message —
   * a gerund phrase, as `emailUnverified` wants it ("sending a delivery").
   */
  verifiedFor?: string;
};

/**
 * Wrap a handler in the checks every authenticated `/api` route repeats.
 *
 * These three lines — a session, the right workspace, and for two routes a
 * confirmed address — opened fourteen endpoints verbatim, which is fourteen
 * chances to spell a message differently, return 401 where the others return
 * 403, or forget one entirely. That last one is the real risk: a missing guard
 * is invisible in review precisely because the surrounding code looks like
 * every other route.
 *
 * The handler runs only once all of them pass, and receives the resolved user
 * already narrowed to non-null, so no route repeats the check to satisfy the
 * type-checker. Routes that must answer differently for signed-out callers —
 * `api/health` — simply don't use this.
 *
 * Deliberately not a place for per-route authorisation. Whether *this* user may
 * touch *this* trip is a question about a row, and it belongs in the query that
 * loads the row (see `data/trip-transition`), not in a wrapper that has never
 * seen one.
 */
export function apiRoute(
  options: ApiRouteOptions,
  handler: (
    event: RequestEvent,
    user: SessionUser,
  ) => Response | Promise<Response>,
) {
  return async (event: RequestEvent): Promise<Response> => {
    const user = event.locals.user;

    if (!user) return apiError(401, "denied", "Sign in required.");
    if (options.role && user.role !== options.role) {
      return apiError(403, "denied", ROLE_REQUIRED[options.role]);
    }
    if (options.verifiedFor && !user.emailVerified) {
      return emailUnverified(options.verifiedFor);
    }

    return handler(event, user);
  };
}

/**
 * A JSON body, or null when there isn't one.
 *
 * `request.json()` throws on an empty or malformed body, and a route that lets
 * that escape answers 500 for what is a client mistake. Half the routes already
 * caught it and half did not; this makes the safe form the shorter one.
 */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  return (await request.json().catch(() => null)) as T | null;
}

/**
 * The `tripId` off a request body, validated as a UUID.
 *
 * The shape check is not cosmetic: the column is `uuid`, and a malformed value
 * reaching it makes Postgres *raise* rather than simply match nothing — a 500
 * where the honest answer is 400.
 */
export async function readTripId(request: Request): Promise<string | null> {
  const body = await readJsonBody<{ tripId?: unknown }>(request);
  const tripId = body?.tripId;

  return isUuid(tripId) ? tripId : null;
}

/** The 400 that a missing or malformed trip id earns. */
export function invalidTripId() {
  return apiError(400, "invalid_request", "Trip id required.");
}
