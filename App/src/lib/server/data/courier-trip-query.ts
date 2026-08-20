import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { ACTIVE_TRIP_STATUSES, CLOSED_TRIP_STATUSES } from '$lib/shared/trip-status';
import type { CourierRequest, CourierTrip } from '$lib/utils/types';

import { db } from '../db';
import { asNumber } from '../db/columns';
import { businessProfiles, deliveryRequests, users } from '../db/schema';

/**
 * How a courier-facing trip row is selected and shaped.
 *
 * Shared by `./courier-trips` (the screens) and `./dispatch` (the ring) — which
 * is why it is its own module rather than living in either. Both need the same
 * projection and the same mappers, and if one owned them the other would have
 * to import from it, making the pair circular.
 */

/**
 * Every courier-facing trip query reads the same columns and joins the same
 * business name, so the projection lives here once rather than being spelled
 * out at each call site.
 */
const tripColumns = {
  id: deliveryRequests.id,
  status: deliveryRequests.status,
  pickupAddress: deliveryRequests.pickupAddress,
  dropoffAddress: deliveryRequests.dropoffAddress,
  pickupLatitude: deliveryRequests.pickupLatitude,
  pickupLongitude: deliveryRequests.pickupLongitude,
  dropoffLatitude: deliveryRequests.dropoffLatitude,
  dropoffLongitude: deliveryRequests.dropoffLongitude,
  estimatedDistanceKm: deliveryRequests.estimatedDistanceKm,
  estimatedDurationMinutes: deliveryRequests.estimatedDurationMinutes,
  dispatchStartedAt: deliveryRequests.dispatchStartedAt,
  requestedAt: deliveryRequests.requestedAt,
  acceptedAt: deliveryRequests.acceptedAt,
  completedAt: deliveryRequests.completedAt,
  notes: deliveryRequests.notes,
  businessName: users.name,
  businessPhone: users.phoneNumber,
  businessDeletedAt: users.deletedAt,
  businessRating: businessProfiles.rating,
  businessRatingCount: businessProfiles.ratingCount
};

export function tripQuery() {
  return (
    db
      .select(tripColumns)
      .from(deliveryRequests)
      .innerJoin(users, eq(deliveryRequests.businessId, users.id))
      // Left, not inner: the profile is created when a business sets its
      // dispatch address, and a trip must not vanish from a rider's screen
      // because the sender hasn't finished onboarding. Both rating columns come
      // back null in that case, which reads as unrated.
      .leftJoin(businessProfiles, eq(businessProfiles.userId, deliveryRequests.businessId))
  );
}

export type TripRow = Awaited<ReturnType<ReturnType<typeof tripQuery>['execute']>>[number];

// ---------------------------------------------------------------------------
// Predicates and orderings
// ---------------------------------------------------------------------------

export const byMostRecentlyAccepted = [
  desc(deliveryRequests.acceptedAt),
  desc(deliveryRequests.requestedAt)
] as const;

export const byMostRecentlyCompleted = [
  desc(deliveryRequests.completedAt),
  desc(deliveryRequests.requestedAt)
] as const;

/** The trip this courier is currently on the hook for. */
export const activeTripsFor = (userId: string) =>
  and(
    eq(deliveryRequests.assignedCourierId, userId),
    inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES])
  );

/** Everything this courier has finished, delivered or cancelled. */
export const closedTripsFor = (userId: string) =>
  and(
    eq(deliveryRequests.assignedCourierId, userId),
    inArray(deliveryRequests.status, [...CLOSED_TRIP_STATUSES])
  );

/** Offers on the board: requested, nobody assigned yet. Not courier-scoped. */
export const openRequests = () =>
  and(eq(deliveryRequests.status, 'requested'), isNull(deliveryRequests.assignedCourierId));

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

export function toCourierRequest(row: TripRow): CourierRequest {
  return {
    id: row.id,
    businessName: row.businessName,
    businessPhone: row.businessPhone,
    pickupAddress: row.pickupAddress,
    dropoffAddress: row.dropoffAddress,
    pickupLat: asNumber(row.pickupLatitude),
    pickupLng: asNumber(row.pickupLongitude),
    dropoffLat: asNumber(row.dropoffLatitude),
    dropoffLng: asNumber(row.dropoffLongitude),
    notes: row.notes,
    requestedAt: row.requestedAt.toISOString(),
    businessDeleted: row.businessDeletedAt != null,
    businessRating: {
      // Null unless somebody has actually rated them: the cached column
      // defaults to 0.00, and showing that as a score would brand every new
      // business a zero.
      average: row.businessRatingCount ? Number(row.businessRating) : null,
      count: row.businessRatingCount ?? 0
    }
  };
}

/**
 * `myRating` defaults to null because most callers are looking at a trip that
 * is still running, where the rider's verdict cannot exist yet. Only the two
 * completed-trip queries pay for the extra read.
 */
export function toCourierTrip(row: TripRow, myRating: number | null = null): CourierTrip {
  return {
    ...toCourierRequest(row),
    // The stored status, not a display stage: the pickup screen has to tell
    // "waiting to be handed the parcel" from "cleared to set off".
    status: row.status,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    estimatedDistanceKm: asNumber(row.estimatedDistanceKm),
    estimatedDurationMinutes: asNumber(row.estimatedDurationMinutes),
    myRating
  };
}
