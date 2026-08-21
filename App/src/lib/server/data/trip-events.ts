import { db } from "../db";
import { tripEvents } from "../db/schema";

/**
 * Append to a trip's audit trail.
 *
 * `payload` is a JSON string column, so every caller was stringifying its own
 * object — doing it here keeps the events uniformly shaped.
 */
export function recordTripEvent(
  tripId: string,
  actorId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
) {
  return db.insert(tripEvents).values({
    tripId,
    actorId,
    eventType,
    payload: JSON.stringify(payload),
  });
}

/** The `status_change` event every trip transition writes. */
export function recordStatusChange(
  tripId: string,
  actorId: string | null,
  change: { from: string; to: string; action?: string },
) {
  return recordTripEvent(tripId, actorId, "status_change", change);
}
