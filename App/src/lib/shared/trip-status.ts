/**
 * Trip status vocabulary, shared by the server data layer, the API routes and
 * the UI. Kept in `shared` rather than next to the Drizzle schema so client
 * code can import it without pulling the database in.
 */

import type { TripPhase, TripStage, TripStatus } from '$lib/utils/types';

/** A courier is on the hook for the trip: assigned but not yet finished. */
export const ACTIVE_TRIP_STATUSES = [
  'accepted',
  'courier_arriving',
  'arrived',
  'picked_up',
  'in_progress'
] as const satisfies readonly TripStatus[];

/** The trip is over, one way or the other. */
export const CLOSED_TRIP_STATUSES = ['completed', 'cancelled'] as const satisfies readonly TripStatus[];

/**
 * The pickup phase: a courier is assigned and the parcel is still on the
 * counter. It ends when the business confirms the handover, which is the only
 * transition out of this list.
 */
export const PICKUP_PHASE_STATUSES = [
  'accepted',
  'courier_arriving',
  'arrived'
] as const satisfies readonly TripStatus[];

/** Whether the parcel is still on the business's counter. */
export function isPickupPhase(status: string): boolean {
  return (PICKUP_PHASE_STATUSES as readonly string[]).includes(status);
}

/**
 * How long either party can still call a delivery off: until the rider reaches
 * the counter, and no further.
 *
 * `courier_arriving` is deliberately outside the window — it is written from
 * the rider's own position when they get within 150 m of the pickup, so by then
 * they are at the shop. Calling it off from a screen at that point leaves
 * someone standing there; that is a conversation, not a button.
 *
 * The two sides differ only in where they start. A business can withdraw a
 * request nobody has taken yet; a courier can only let go of one they hold —
 * turning down an offer they never accepted is `POST /api/courier/decline-trip`,
 * which is a different thing with a different memory.
 */
export const CANCELLABLE_STATUSES = ['requested', 'accepted'] as const satisfies readonly TripStatus[];

export function isCancellableByBusiness(status: string): boolean {
  return (CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

export function isReleasableByCourier(status: string): boolean {
  return status === 'accepted';
}

/**
 * The same window, in the vocabulary the business screens hold. They deal in
 * stages rather than statuses, and `requested`/`accepted` collapse to these two.
 */
export function isCancellableStage(stage: TripStage): boolean {
  return stage === 'searching' || stage === 'assigned';
}

/**
 * Which half of the journey a trip is in. `picked_up` counts as delivery: the
 * parcel is with the courier, even though they haven't set off yet.
 */
export function toTripPhase(status: string): TripPhase {
  return isPickupPhase(status) ? 'pickup' : 'delivery';
}

/**
 * Collapse a stored status to the stage the courier app shows.
 *
 * `courier_arriving` and `picked_up` both land on `arrived`: to a pill they are
 * the same moment — the courier is at the shop. Screens that must act on the
 * difference (the pickup screen decides between "waiting to be handed the
 * parcel" and "start delivery") read the stored status instead.
 */
export function toTripStage(status: string): TripStage {
  switch (status) {
    case 'requested':
      return 'searching';
    case 'accepted':
      return 'assigned';
    case 'courier_arriving':
    case 'arrived':
    case 'picked_up':
      return 'arrived';
    case 'in_progress':
      return 'en_route';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'searching';
  }
}

/**
 * The courier screen that owns a trip at its current status: the delivery leg
 * has its own screen, everything before it belongs to pickup — including
 * `picked_up`, where the courier still has to press "Start delivery". Shared so
 * Home and Orders can't disagree about where "Open active trip" goes.
 */
export function courierTripHref(trip: { id: string; status: TripStatus }) {
  const route = trip.status === 'in_progress' ? '/deliver' : '/pickup';
  return `${route}?tripId=${encodeURIComponent(trip.id)}`;
}

/**
 * The same collapse for business-facing screens (dashboard, history, tracking).
 *
 * `picked_up` reads as en route here: the sender's parcel has left their hands,
 * which is what their board is tracking. `courier_arriving` deliberately does
 * not collapse — "the rider is at your counter" is the business's cue to
 * confirm the handover, so it has to stay visible as its own state.
 */
export function toDispatchStage(status: string): TripStage {
  return status === 'picked_up' ? 'en_route' : toTripStage(status);
}
