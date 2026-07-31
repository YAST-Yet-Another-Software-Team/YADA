/**
 * Trip status vocabulary, shared by the server data layer, the API routes and
 * the UI. Kept in `shared` rather than next to the Drizzle schema so client
 * code can import it without pulling the database in.
 */

import type { TripStage, TripStatus } from '$lib/utils/types';

/** A courier is on the hook for the trip: assigned but not yet finished. */
export const ACTIVE_TRIP_STATUSES = [
  'accepted',
  'courier_arriving',
  'arrived',
  'in_progress'
] as const satisfies readonly TripStatus[];

/** The trip is over, one way or the other. */
export const CLOSED_TRIP_STATUSES = ['completed', 'cancelled'] as const satisfies readonly TripStatus[];

/**
 * Collapse a stored status to the stage the courier app shows, which keeps
 * "arrived" distinct because that's the courier's cue to hand the parcel over.
 */
export function toTripStage(status: string): TripStage {
  switch (status) {
    case 'requested':
      return 'searching';
    case 'accepted':
      return 'assigned';
    case 'courier_arriving':
    case 'in_progress':
      return 'en_route';
    case 'arrived':
      return 'arrived';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'searching';
  }
}

/**
 * The courier screen that owns a trip at its current stage: once the parcel is
 * in transit the job is delivery, before that it's still pickup. Shared so Home
 * and Orders can't disagree about where "Open active trip" goes.
 */
export function courierTripHref(trip: { id: string; status: TripStage }) {
  const route = trip.status === 'en_route' ? '/courier/deliver' : '/courier/pickup';
  return `${route}?tripId=${encodeURIComponent(trip.id)}`;
}

/**
 * The same collapse for business-facing screens (dashboard, history, tracking),
 * which don't distinguish "arrived" from "en route" — to the sender the parcel
 * is in transit either way.
 */
export function toDispatchStage(status: string): TripStage {
  const stage = toTripStage(status);
  return stage === 'arrived' ? 'en_route' : stage;
}
