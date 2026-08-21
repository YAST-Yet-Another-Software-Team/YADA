import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { and, eq, isNull } from "drizzle-orm";

import {
  apiError,
  apiRoute,
  invalidTripId,
  readTripId,
} from "$lib/server/api-guard";
import { db } from "$lib/server/db";
import { deliveryRequests, tripDeclines } from "$lib/server/db/schema";
import { recordStatusChange } from "$lib/server/data/trip-events";
import { applyTripChange, tripExists } from "$lib/server/data/trip-transition";

// The email gate is belt and braces behind the availability one: this endpoint
// is reachable on its own and never re-reads the online flag, so an unverified
// courier who was rung by a stale screen could otherwise still take the job.
export const POST: RequestHandler = apiRoute(
  { role: "courier", verifiedFor: "accepting a delivery" },
  async ({ request }, user) => {
    const tripId = await readTripId(request);
    if (!tripId) return invalidTripId();

    // "No" is final for this request: a courier who declined isn't ringed on a
    // re-ring, and can't quietly take the job back through a stale screen either.
    const [declined] = await db
      .select({ id: tripDeclines.id })
      .from(tripDeclines)
      .where(
        and(
          eq(tripDeclines.tripId, tripId),
          eq(tripDeclines.courierId, user.id),
        ),
      )
      .limit(1);

    if (declined) {
      return apiError(409, "conflict", "You declined this delivery.");
    }

    // Deliberately no ring/timeout check: the board only *shows* what's ringing,
    // but a just-in-time accept at second 61 still beats telling the business
    // nobody came. The claim itself is a single conditional UPDATE — see
    // `data/trip-transition` for why that matters more here than anywhere else.
    const claimed = await applyTripChange(
      tripId,
      [
        eq(deliveryRequests.status, "requested"),
        isNull(deliveryRequests.assignedCourierId),
      ],
      {
        assignedCourierId: user.id,
        status: "accepted",
        acceptedAt: new Date(),
      },
    );

    if (!claimed) {
      // Two reasons, which must not share a status code: the id names no trip
      // (404, indistinguishable from one belonging to someone else, so a
      // stranger probing ids learns nothing), or it names one another rider
      // just took (409, which the board turns into "gone already" rather than
      // an error about a trip the courier was legitimately looking at).
      return (await tripExists(tripId))
        ? apiError(
            409,
            "conflict",
            "Another rider has already taken this delivery.",
          )
        : apiError(404, "no_results", "Trip not found.");
    }

    await recordStatusChange(tripId, user.id, {
      from: "requested",
      to: "accepted",
    });

    return json({ ok: true, tripId });
  },
);
