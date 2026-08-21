import { and, eq, gt, isNotNull } from "drizzle-orm";

import { MAX_MATCH_RADIUS_KM, RING_STEPS } from "$lib/shared/dispatch";
import { minutesAway } from "$lib/shared/geo/nearby";
import { haversineKm } from "$lib/shared/geo/service-area";
import type { LatLng } from "$lib/utils/types";

import { db } from "../db";
import { courierProfiles } from "../db/schema";

export { MAX_MATCH_RADIUS_KM };

/**
 * The rubric that decides who a trip is offered to, and when.
 *
 * SRS 3.2: dispatch goes to the highest-ranked courier by proximity/ETA and
 * rating, cascading down the list on decline or timeout. This module is the
 * ranking half of that; the dispatcher that applies it is `ringingRequestRows`
 * in `./courier`, which asks `offerWindow` when each courier's alert opens and
 * `courierMatchScore` how to order what is already ringing. Neither runs on a
 * schedule — both are pure functions of elapsed time, evaluated on every poll.
 *
 * All numbers here are PROVISIONAL and expected to move with field data. What
 * should not move is the shape: a score in [0, 1], monotone in closeness and in
 * reputation, with reputation smoothed so it cannot bury a newcomer.
 */

/**
 * A stored fix older than this says where a courier was, not where they are.
 * Deliberately looser than the 2-minute freshness the handover confirmations
 * demand: refusing a confirmation needs certainty, ranking candidates only
 * needs plausibility.
 */
export const MATCH_LOCATION_FRESH_MS = 10 * 60 * 1000;

/**
 * The cold-start prior: every courier is treated as carrying this many
 * phantom ratings at this value, which the real ones progressively outvote.
 *
 * Without it a single 5★ outranks a 4.9★ veteran, and a rider's first 3★ is a
 * career sentence. With mean 3.5 / weight 3: no ratings scores as 3.5; one 5★
 * as (10.5 + 5) / 4 ≈ 3.9; a hundred ratings as ~their true average. New
 * riders start mid-field — visible, neither gifted the top nor buried.
 */
export const RATING_PRIOR_MEAN = 3.5;
export const RATING_PRIOR_WEIGHT = 3;

/**
 * Proximity dominates on purpose: this is food, and a cold delivery from a
 * charming rider is still a cold delivery. Rating is the tiebreak among
 * comparably placed riders — which is exactly the margin where "best
 * behaviour" is decided.
 */
export const PROXIMITY_WEIGHT = 0.7;
export const RATING_WEIGHT = 0.3;

/** The prior-smoothed average, on the 1–5 scale. */
export function smoothedRating(average: number, ratingCount: number) {
  return (
    (RATING_PRIOR_MEAN * RATING_PRIOR_WEIGHT + average * ratingCount) /
    (RATING_PRIOR_WEIGHT + ratingCount)
  );
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** One candidate's score in [0, 1]. Higher is offered first. */
export function courierMatchScore(input: {
  distanceKm: number;
  rating: number;
  ratingCount: number;
}) {
  const proximity = clamp01(1 - input.distanceKm / MAX_MATCH_RADIUS_KM);
  // 1–5 → 0–1, so a weight compares like with like.
  const reputation = clamp01(
    (smoothedRating(input.rating, input.ratingCount) - 1) / 4,
  );

  return PROXIMITY_WEIGHT * proximity + RATING_WEIGHT * reputation;
}

/**
 * A courier already carrying a parcel is only ringed when their current trip
 * ends where the new one starts — the first ring's radius, because "I'll be
 * right there when I finish" is only true of *right there*.
 */
export const BUSY_MATCH_RADIUS_KM = RING_STEPS[0].radiusKm;

/**
 * Busy couriers hear the offer a beat after idle ones. "Nearest and idle has
 * highest priority" — an idle rider at 300 m should not lose a chaining race
 * to a busy one finishing next door.
 */
export const BUSY_ENTRY_DELAY_SECONDS = 3;

/**
 * Within a ring, reputation staggers entry: a top-rated courier hears the offer
 * the moment their ring opens, the lowest-rated up to this many seconds later.
 * This is how "low ratings have least priority" cashes out without ever
 * excluding anyone — a late alert, not a blacklist.
 */
export const RATING_STAGGER_SECONDS = 5;

/**
 * When this courier's phone starts ringing for a request, in seconds after
 * dispatch — or null if it never does.
 *
 * `distanceKm` is the courier's ringing position to the pickup: where they
 * are, for an idle courier; where their current trip *ends*, for a busy one.
 * The caller checks `elapsed >= offerWindow(...)` (and the 60 s timeout) each
 * time the board is computed, which is what makes the rings work without a
 * scheduler.
 */
export function offerWindow(input: {
  distanceKm: number;
  busy: boolean;
  rating: number;
  ratingCount: number;
}): number | null {
  const reputation = clamp01(
    (smoothedRating(input.rating, input.ratingCount) - 1) / 4,
  );
  const stagger = (1 - reputation) * RATING_STAGGER_SECONDS;

  if (input.busy) {
    if (input.distanceKm > BUSY_MATCH_RADIUS_KM) return null;
    return BUSY_ENTRY_DELAY_SECONDS + stagger;
  }

  const ring = RING_STEPS.find((step) => input.distanceKm <= step.radiusKm);
  if (!ring) return null;

  return ring.startsAtSeconds + stagger;
}

/**
 * Where the online riders are, for the business's own map.
 *
 * Same population the dispatcher ranks — active, with a fix recent enough to be
 * believed — but this is a *view*, not a shortlist, so it carries no identity:
 * no name, no rating, no id that means anything off this response. A business
 * watching riders move around their shop is being shown supply, not people.
 *
 * The position is rounded to four decimals (~11 m) before it leaves the server.
 * At the zoom this is drawn at that is invisible, and it keeps the endpoint
 * from being a metre-accurate tracker of individuals nobody has hired.
 */
export type NearbyCourier = {
  /** Opaque and stable within a session, so a marker can be keyed and moved. */
  ref: string;
  lat: number;
  lng: number;
  minutesAway: number;
};

export async function nearbyCouriers(
  pickup: LatLng,
  options: {
    radiusKm: number;
    limit?: number;
    ref: (courierId: string) => string;
  },
): Promise<NearbyCourier[]> {
  const freshAfter = new Date(Date.now() - MATCH_LOCATION_FRESH_MS);

  const rows = await db
    .select({
      courierId: courierProfiles.userId,
      lat: courierProfiles.currentLatitude,
      lng: courierProfiles.currentLongitude,
    })
    .from(courierProfiles)
    .where(
      and(
        eq(courierProfiles.active, true),
        isNotNull(courierProfiles.currentLatitude),
        isNotNull(courierProfiles.currentLongitude),
        gt(courierProfiles.lastLocationAt, freshAfter),
      ),
    );

  return rows
    .map((row) => {
      const point = { lat: Number(row.lat), lng: Number(row.lng) };

      return {
        ref: options.ref(row.courierId),
        lat: Number(point.lat.toFixed(4)),
        lng: Number(point.lng.toFixed(4)),
        distanceKm: haversineKm(pickup, point),
      };
    })
    .filter((courier) => courier.distanceKm <= options.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, options.limit ?? 25)
    .map(({ distanceKm, ...courier }) => ({
      ...courier,
      minutesAway: minutesAway(distanceKm),
    }));
}
