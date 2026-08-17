import { and, avg, count, eq, inArray } from 'drizzle-orm';

import { db } from '../db';
import { businessProfiles, courierProfiles, tripRatings } from '../db/schema';

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
 * Which side of a trip is being scored. Decides only which profile table holds
 * the cached average — the `trip_ratings` row itself is identical either way.
 */
export type RatedRole = 'courier' | 'business';

/**
 * Record one party's verdict on the other and refresh the rated party's cached
 * average in the same transaction.
 *
 * Direction is a parameter rather than two near-identical functions: both
 * halves of SRS 3.4 write the same row shape into the same table with the same
 * unique constraint, and the only thing that differs is which profile caches
 * the result. Forking here would mean two places to fix when the aggregate rule
 * changes, and the second one would be the one nobody remembered.
 *
 * The average is recomputed from the `trip_ratings` aggregate rather than
 * nudged incrementally — `(old * n + stars) / (n + 1)` drifts the moment any
 * row is ever deleted or corrected, and an aggregate over one party's ratings
 * is cheap at any volume this app will see. Ratings are append-only by design:
 * a rating you can revise after the other side argues with you isn't a rating,
 * it's a negotiation.
 */
export async function rateForTrip(input: {
  tripId: string;
  raterId: string;
  ratedId: string;
  ratedRole: RatedRole;
  stars: number;
  comment: string | null;
}) {
  try {
    return await db.transaction(async (tx) => {
      await tx.insert(tripRatings).values({
        tripId: input.tripId,
        raterId: input.raterId,
        ratedId: input.ratedId,
        stars: input.stars,
        comment: input.comment
      });

      const [aggregate] = await tx
        .select({ average: avg(tripRatings.stars), total: count() })
        .from(tripRatings)
        .where(eq(tripRatings.ratedId, input.ratedId));

      const average = Number(aggregate.average ?? 0);
      const cache = {
        rating: average.toFixed(2),
        ratingCount: aggregate.total,
        updatedAt: new Date()
      };

      // Both profile tables carry the same two columns for the same reason, so
      // the only branch is the table. A rated party with no profile row simply
      // updates nothing: the rating is still recorded, and the aggregate above
      // remains the source of truth the cache is rebuilt from.
      if (input.ratedRole === 'courier') {
        await tx
          .update(courierProfiles)
          .set(cache)
          .where(eq(courierProfiles.userId, input.ratedId));
      } else {
        await tx
          .update(businessProfiles)
          .set(cache)
          .where(eq(businessProfiles.userId, input.ratedId));
      }

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
