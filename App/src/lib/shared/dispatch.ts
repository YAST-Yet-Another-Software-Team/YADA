/**
 * The dispatch clock: how a request's search widens over time.
 *
 * A request rings couriers in expanding rings — 400 m for the first 15 seconds,
 * 800 m until 35, then the whole match radius until the 60-second timeout.
 * After that nobody is ringed and the business re-rings manually.
 *
 * There is deliberately no timer anywhere. The current ring is a pure function
 * of `now − dispatch_started_at`, evaluated wherever it's needed: the courier
 * board computes it when it polls, the tracking screen computes it to show the
 * business what's happening, and a server restart forgets nothing because
 * nothing was remembered. Shared rather than server-only because the business
 * UI must describe the same clock the server enforces.
 */

import type { TripStage } from "$lib/utils/types";

/** Beyond this a courier isn't a candidate at all — roughly the service zone. */
export const MAX_MATCH_RADIUS_KM = 6;

export const RING_STEPS = [
  { radiusKm: 0.4, startsAtSeconds: 0 },
  { radiusKm: 0.8, startsAtSeconds: 15 },
  { radiusKm: MAX_MATCH_RADIUS_KM, startsAtSeconds: 35 },
] as const;

/** After this the request has failed quietly; only a manual re-ring restarts it. */
export const DISPATCH_TIMEOUT_SECONDS = 60;

/** The ring in force at `elapsed`, or null once the request has timed out. */
export function ringForElapsed(elapsedSeconds: number) {
  if (elapsedSeconds > DISPATCH_TIMEOUT_SECONDS) return null;

  // Walk from widest to narrowest and keep the last ring already started.
  for (let index = RING_STEPS.length - 1; index >= 0; index--) {
    if (elapsedSeconds >= RING_STEPS[index].startsAtSeconds) {
      return { index, radiusKm: RING_STEPS[index].radiusKm };
    }
  }

  return { index: 0, radiusKm: RING_STEPS[0].radiusKm };
}

export function isDispatchExpired(elapsedSeconds: number) {
  return elapsedSeconds > DISPATCH_TIMEOUT_SECONDS;
}

/**
 * Whether riders are being ringed for this request *right now* — the question
 * every animated element on a business screen should be asking.
 *
 * The stage alone cannot answer it. A request stays `searching` after its
 * window closes with nobody accepting, because it is still unassigned, so
 * anything keyed on the stage keeps pulsing over a search that has already
 * failed and reads as work still in progress. Only a manual re-ring restarts
 * it, and a live-looking screen is exactly what stops someone pressing that.
 *
 * A null `dispatchStartedAt` counts as matching: rows predating the dispatch
 * clock, and the gap between a request being written and its first round
 * starting, are both better shown as searching than as failed.
 */
export function isMatchingNow(
  stage: TripStage,
  dispatchStartedAt: string | null,
) {
  if (stage !== "searching") return false;
  if (!dispatchStartedAt) return true;

  return !isDispatchExpired(
    (Date.now() - new Date(dispatchStartedAt).getTime()) / 1000,
  );
}

/**
 * How much of the dispatch window is left, 1 at the start and 0 at the timeout.
 *
 * This is what the business sees instead of a countdown. The seconds are real
 * and the server enforces them, but a number ticking down is a specification of
 * the dispatcher — it says how long the window is, so it says how long to wait
 * before a decline stops mattering. A bar draining says the one thing a
 * business can act on: this is still running, and it will not run forever.
 *
 * Clamped rather than allowed to go negative, because the tracking screen keeps
 * ticking locally between polls and would otherwise draw a bar past empty.
 */
export function dispatchRemaining(elapsedSeconds: number) {
  const left =
    (DISPATCH_TIMEOUT_SECONDS - elapsedSeconds) / DISPATCH_TIMEOUT_SECONDS;

  return Math.min(1, Math.max(0, left));
}

/**
 * How wide the search *feels*, 0–1 across the rings — not how wide it is.
 *
 * The map scales its pulse and its zoom off this so the search visibly reaches
 * further as the dispatcher widens. It is deliberately an index into
 * `RING_STEPS` rather than the radius in metres: 400 m and 6 km are four
 * fifteenths and the whole of the zone, and a ring drawn to scale would be a
 * legible statement of both numbers on screen. What a business needs to know is
 * "we are looking further out now", which is what an ordinal gives.
 *
 * There used to be a `ringLabel` here returning "within 400 m" / "across the
 * zone" for the same spot on the tracking screen. It was replaced, not moved:
 * printing the radius is exactly the detail this is here to avoid.
 */
export function ringReach(ringIndex: number) {
  if (RING_STEPS.length < 2) return 0;

  return Math.min(1, Math.max(0, ringIndex / (RING_STEPS.length - 1)));
}
