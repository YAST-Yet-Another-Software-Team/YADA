import { and, eq, type SQL } from "drizzle-orm";

import { apiError } from "../api-guard";
import { db } from "../db";
import { deliveryRequests } from "../db/schema";

/**
 * Moving a trip from one state to another, safely.
 *
 * Every endpoint that changes a trip does the same three things: load the row
 * to see whether the change is allowed, decide, then write. The trap is in the
 * third step — writing by id alone, having decided from a row that was read a
 * round trip ago. Between the two the row can move, and the write applies a
 * transition whose preconditions no longer hold, then reports success for it.
 *
 * `accept-trip` is where that actually bites: a dispatch ring alerts several
 * riders at once *by design*, so two couriers accepting the same offer in the
 * same instant is the expected case. With the predicate only on the SELECT,
 * both pass it, both write, and the loser is told they have the job.
 *
 * So the rule this module exists to make cheap: **the conditions the decision
 * was made under go on the UPDATE**, and whether the update matched a row is
 * the only trustworthy answer to "did it happen". Postgres arbitrates; nothing
 * here has to reason about interleaving.
 */

/** What a caller is told when the row moved under them. */
export const TRIP_MOVED_MESSAGE =
  "This delivery has moved on — refresh and try again.";

/** The 409 a lost race earns. */
export function tripMoved(message = TRIP_MOVED_MESSAGE) {
  return apiError(409, "conflict", message);
}

type TripChanges = Partial<typeof deliveryRequests.$inferInsert>;

/**
 * Apply `changes` to a trip, but only while `conditions` still hold.
 *
 * Returns whether a row actually changed. Callers pass the same predicates
 * their checks assumed — ownership, the status they read, sometimes the exact
 * dispatch clock — and treat `false` as a conflict rather than an error.
 */
export async function applyTripChange(
  tripId: string,
  conditions: SQL[],
  changes: TripChanges,
): Promise<boolean> {
  const [row] = await db
    .update(deliveryRequests)
    .set(changes)
    .where(and(eq(deliveryRequests.id, tripId), ...conditions))
    .returning({ id: deliveryRequests.id });

  return row != null;
}

/** Does this trip exist at all? Only for telling a 404 from a 409. */
export async function tripExists(tripId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: deliveryRequests.id })
    .from(deliveryRequests)
    .where(eq(deliveryRequests.id, tripId))
    .limit(1);

  return row != null;
}
