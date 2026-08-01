import { and, eq, gt, isNotNull } from 'drizzle-orm';

import { haversineKm } from '$lib/shared/geo/service-area';
import type { LatLng } from '$lib/utils/types';

import { db } from '../db';
import { courierProfiles, users } from '../db/schema';

/**
 * The rubric that will decide who a trip is offered to.
 *
 * SRS 3.2: dispatch goes to the highest-ranked courier by proximity/ETA and
 * rating, cascading down the list on decline or timeout. That dispatcher isn't
 * built yet — today's board shows every open request to every online courier —
 * but the *ranking* is this module, written now so the ratings being collected
 * have a consumer with defined semantics, and so the matcher, when it lands,
 * imports a function rather than an argument about weights.
 *
 * All numbers here are PROVISIONAL and expected to move with field data. What
 * should not move is the shape: a score in [0, 1], monotone in closeness and in
 * reputation, with reputation smoothed so it cannot bury a newcomer.
 */

/**
 * Beyond this a courier isn't a candidate at all. The service zone is roughly
 * five kilometres corner to corner, so this is "anywhere in the zone, but
 * nearer beats farther".
 */
export const MAX_MATCH_RADIUS_KM = 6;

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
  const reputation = clamp01((smoothedRating(input.rating, input.ratingCount) - 1) / 4);

  return PROXIMITY_WEIGHT * proximity + RATING_WEIGHT * reputation;
}

export type RankedCourier = {
  courierId: string;
  name: string;
  distanceKm: number;
  rating: number;
  ratingCount: number;
  score: number;
};

/**
 * The candidates for a pickup, best first: active couriers with a fresh
 * location inside the match radius, scored by the rubric above.
 *
 * This is the function the dispatcher calls when it exists. `active` is the
 * profile flag, not the client-side online toggle — wiring the toggle through
 * to the server is part of the matcher's work, not the rubric's.
 */
export async function rankCouriersForPickup(
  pickup: LatLng,
  options?: { limit?: number }
): Promise<RankedCourier[]> {
  const freshAfter = new Date(Date.now() - MATCH_LOCATION_FRESH_MS);

  const rows = await db
    .select({
      courierId: courierProfiles.userId,
      name: users.name,
      lat: courierProfiles.currentLatitude,
      lng: courierProfiles.currentLongitude,
      rating: courierProfiles.rating,
      ratingCount: courierProfiles.ratingCount
    })
    .from(courierProfiles)
    .innerJoin(users, eq(courierProfiles.userId, users.id))
    .where(
      and(
        eq(courierProfiles.active, true),
        isNotNull(courierProfiles.currentLatitude),
        isNotNull(courierProfiles.currentLongitude),
        gt(courierProfiles.lastLocationAt, freshAfter)
      )
    );

  return rows
    .map((row) => {
      const distanceKm = haversineKm(pickup, {
        lat: Number(row.lat),
        lng: Number(row.lng)
      });
      const rating = Number(row.rating);
      const ratingCount = row.ratingCount;

      return {
        courierId: row.courierId,
        name: row.name,
        distanceKm,
        rating,
        ratingCount,
        score: courierMatchScore({ distanceKm, rating, ratingCount })
      };
    })
    .filter((candidate) => candidate.distanceKm <= MAX_MATCH_RADIUS_KM)
    .sort((a, b) => b.score - a.score)
    .slice(0, options?.limit ?? 10);
}
