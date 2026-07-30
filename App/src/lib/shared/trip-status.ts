/**
 * Trip status vocabulary, shared by the server data layer, the API routes and
 * the UI. Kept in `shared` rather than next to the Drizzle schema so client
 * code can import it without pulling the database in.
 */

/** The `trip_status` enum as stored in the database. */
export type TripStatus =
  | 'requested'
  | 'accepted'
  | 'courier_arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** A courier is on the hook for the trip: assigned but not yet finished. */
export const ACTIVE_TRIP_STATUSES = [
  'accepted',
  'courier_arriving',
  'arrived',
  'in_progress'
] as const satisfies readonly TripStatus[];

/** The trip is over, one way or the other. */
export const CLOSED_TRIP_STATUSES = ['completed', 'cancelled'] as const satisfies readonly TripStatus[];

/** The six states the UI renders — see `StatusPill`. */
export type TripStage = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

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
 * The same collapse for business-facing screens (dashboard, history, tracking),
 * which don't distinguish "arrived" from "en route" — to the sender the parcel
 * is in transit either way.
 */
export function toDispatchStage(status: string): TripStage {
  const stage = toTripStage(status);
  return stage === 'arrived' ? 'en_route' : stage;
}
