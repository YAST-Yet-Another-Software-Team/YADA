import { and, avg, count, eq, inArray } from 'drizzle-orm';

import { db } from '../db';
import { courierProfiles, tripRatings } from '../db/schema';

/** The second rating of the same trip by the same rater. A conflict, not an update. */
export class AlreadyRatedError extends Error {
  constructor() {
    super("You've already rated this delivery.");
    this.name = 'AlreadyRatedError';
  }
}

/** Postgres unique-violation, whether drizzle hands the pg error over bare or wrapped. */
function isUniqueViolation(error: unknown) {
  const code =
    (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
  return code === '23505';
}

/**
 * Record the business's verdict on a courier and refresh the courier's cached
 * average in the same transaction.
 *
 * The average is recomputed from the `trip_ratings` aggregate rather than
 * nudged incrementally — `(old * n + stars) / (n + 1)` drifts the moment any
 * row is ever deleted or corrected, and an aggregate over a courier's ratings
 * is cheap at any volume this app will see. Ratings are append-only by design:
 * a rating you can revise after the rider argues with you isn't a rating, it's
 * a negotiation.
 */
export async function rateCourierForTrip(input: {
  tripId: string;
  raterId: string;
  courierId: string;
  stars: number;
  comment: string | null;
}) {
  try {
    return await db.transaction(async (tx) => {
      await tx.insert(tripRatings).values({
        tripId: input.tripId,
        raterId: input.raterId,
        ratedId: input.courierId,
        stars: input.stars,
        comment: input.comment
      });

      const [aggregate] = await tx
        .select({ average: avg(tripRatings.stars), total: count() })
        .from(tripRatings)
        .where(eq(tripRatings.ratedId, input.courierId));

      const average = Number(aggregate.average ?? 0);

      await tx
        .update(courierProfiles)
        .set({
          rating: average.toFixed(2),
          ratingCount: aggregate.total,
          updatedAt: new Date()
        })
        .where(eq(courierProfiles.userId, input.courierId));

      return { average, total: aggregate.total };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AlreadyRatedError();
    throw error;
  }
}

/**
 * The stars this rater already gave, per trip — for the dashboard and history,
 * which must offer "rate this" only where no rating exists.
 */
export async function ratingsByRaterFor(raterId: string, tripIds: string[]) {
  if (tripIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({ tripId: tripRatings.tripId, stars: tripRatings.stars })
    .from(tripRatings)
    .where(and(eq(tripRatings.raterId, raterId), inArray(tripRatings.tripId, tripIds)));

  return new Map(rows.map((row) => [row.tripId, row.stars]));
}

/** This rater's stars for one trip, or null. The tracking screen's question. */
export async function ratingByRaterForTrip(raterId: string, tripId: string) {
  const [row] = await db
    .select({ stars: tripRatings.stars })
    .from(tripRatings)
    .where(and(eq(tripRatings.raterId, raterId), eq(tripRatings.tripId, tripId)))
    .limit(1);

  return row?.stars ?? null;
}
