import { desc, eq } from 'drizzle-orm';

import { DISPATCH_TIMEOUT_SECONDS } from '$lib/shared/dispatch';
import { haversineKm } from '$lib/shared/geo/service-area';
import type { CourierOffer, LatLng } from '$lib/utils/types';

import { db } from '../db';
import { asNumber, round } from '../db/columns';
import { courierProfiles, deliveryRequests, tripDeclines } from '../db/schema';
import {
  openRequests,
  toCourierRequest,
  tripQuery,
  type TripRow
} from './courier-trip-query';
import { courierMatchScore, MATCH_LOCATION_FRESH_MS, offerWindow } from './matching';

/**
 * The dispatcher: which open requests are ringing a given courier right now.
 *
 * Every open request carries its dispatch clock, and each courier's board asks
 * the same three questions of each one:
 *
 *   1. Am I excluded? Declined requests never come back, offline couriers hear
 *      nothing, and without a fresh position there is no distance to ring by —
 *      the unlocatable can't be "nearest".
 *   2. Has my ring opened? `offerWindow` gives the second this courier's alert
 *      starts — ring by distance, staggered by rating, delayed if busy — and
 *      the request's elapsed time either has or hasn't reached it.
 *   3. Has the whole search expired? Past the 60 s timeout nobody is ringed,
 *      and only the business can restart the clock.
 *
 * Priority is emergent rather than orchestrated: nearer couriers' windows open
 * earlier, idle beats busy, higher-rated beats lower-rated within a ring — all
 * of it falls out of the window arithmetic, evaluated on every poll, with no
 * scheduler to crash or drift.
 *
 * A busy courier's ringing position is where their current trip *ends*: they
 * qualify only when that drop-off is inside the first ring of the new pickup.
 */
export async function ringingRequestRows(userId: string, activeTripRow: TripRow | null) {
  const [profile] = await db
    .select({
      lat: courierProfiles.currentLatitude,
      lng: courierProfiles.currentLongitude,
      locatedAt: courierProfiles.lastLocationAt,
      rating: courierProfiles.rating,
      ratingCount: courierProfiles.ratingCount,
      active: courierProfiles.active
    })
    .from(courierProfiles)
    .where(eq(courierProfiles.userId, userId))
    .limit(1);

  if (!profile?.active) return [];

  const busy = activeTripRow != null;
  let origin: LatLng | null = null;

  if (busy) {
    if (activeTripRow.dropoffLatitude != null && activeTripRow.dropoffLongitude != null) {
      origin = {
        lat: Number(activeTripRow.dropoffLatitude),
        lng: Number(activeTripRow.dropoffLongitude)
      };
    }
  } else if (
    profile.lat != null &&
    profile.lng != null &&
    profile.locatedAt != null &&
    Date.now() - profile.locatedAt.getTime() <= MATCH_LOCATION_FRESH_MS
  ) {
    origin = { lat: Number(profile.lat), lng: Number(profile.lng) };
  }

  if (!origin) return [];

  const declinedRows = await db
    .select({ tripId: tripDeclines.tripId })
    .from(tripDeclines)
    .where(eq(tripDeclines.courierId, userId));
  const declined = new Set(declinedRows.map((row) => row.tripId));

  const open = await tripQuery().where(openRequests()).orderBy(desc(deliveryRequests.requestedAt));

  const now = Date.now();
  const rating = Number(profile.rating);
  const ratingCount = profile.ratingCount;

  return open
    .filter((row) => !declined.has(row.id) && row.pickupLatitude != null)
    .map((row) => {
      const distanceKm = haversineKm(origin, {
        lat: Number(row.pickupLatitude),
        lng: Number(row.pickupLongitude)
      });

      const opensAt = offerWindow({ distanceKm, busy, rating, ratingCount });
      if (opensAt == null) return null;

      const elapsedSeconds = (now - row.dispatchStartedAt.getTime()) / 1000;
      if (elapsedSeconds < opensAt || elapsedSeconds > DISPATCH_TIMEOUT_SECONDS) return null;

      return {
        row,
        score: courierMatchScore({ distanceKm, rating, ratingCount }),
        // Carried out with the row rather than recomputed on the client: this is
        // the distance the dispatcher ranked this courier by, and the client has
        // no way to know it — a busy rider is ringed from where their current
        // trip *ends*, not from where they are.
        distanceToPickupKm: round(distanceKm, 1),
        expiresInSeconds: Math.max(0, Math.round(DISPATCH_TIMEOUT_SECONDS - elapsedSeconds))
      };
    })
    .filter((candidate) => candidate != null)
    .sort((a, b) => b.score - a.score);
}

/** An offer as its screen needs it: the request plus what the ring decided. */
export function toCourierOffer(candidate: {
  row: TripRow;
  distanceToPickupKm: number;
  expiresInSeconds: number;
}): CourierOffer {
  return {
    ...toCourierRequest(candidate.row),
    distanceToPickupKm: candidate.distanceToPickupKm,
    tripDistanceKm: asNumber(candidate.row.estimatedDistanceKm),
    expiresInSeconds: candidate.expiresInSeconds
  };
}
