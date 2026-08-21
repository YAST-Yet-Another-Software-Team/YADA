import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { and, eq } from "drizzle-orm";

import { apiError, apiRoute, readJsonBody } from "$lib/server/api-guard";
import { courierWithinRange } from "$lib/server/data/courier-location";
import { db } from "$lib/server/db";
import { deliveryRequests } from "$lib/server/db/schema";
import { recordStatusChange } from "$lib/server/data/trip-events";
import { applyTripChange, tripMoved } from "$lib/server/data/trip-transition";
import { DELIVERY_PROXIMITY_KM } from "$lib/shared/geo/proximity";
import type { TripStatus } from "$lib/utils/types";
import { isUuid } from "$lib/shared/uuid";

/**
 * The two transitions a courier drives, one at each end of the delivery phase.
 *
 * Reaching the pickup isn't among them — that's written automatically from the
 * courier's position by `POST /api/location` — and neither is the pickup
 * itself, which only the business can confirm.
 */
const NEXT_STATUS = {
  start_delivery: "in_progress",
  complete: "completed",
} as const satisfies Record<string, TripStatus>;

type TripAction = keyof typeof NEXT_STATUS;

function isTripAction(value: unknown): value is TripAction {
  return typeof value === "string" && value in NEXT_STATUS;
}

export const POST: RequestHandler = apiRoute(
  { role: "courier" },
  async ({ request }, user) => {
    const body = await readJsonBody<{ tripId?: unknown; action?: unknown }>(
      request,
    );
    const tripId = body?.tripId;
    const action = body?.action;

    if (!isUuid(tripId) || !isTripAction(action)) {
      return apiError(400, "invalid_request", "Trip id and action required.");
    }

    // Scoped to the courier's own trip, so the assignment check and the lookup
    // are the same query.
    const [trip] = await db
      .select({
        status: deliveryRequests.status,
        dropoffLatitude: deliveryRequests.dropoffLatitude,
        dropoffLongitude: deliveryRequests.dropoffLongitude,
      })
      .from(deliveryRequests)
      .where(
        and(
          eq(deliveryRequests.id, tripId),
          eq(deliveryRequests.assignedCourierId, user.id),
        ),
      )
      .limit(1);

    if (!trip) {
      return apiError(404, "no_results", "Trip not found.");
    }

    // Delivery starts from the handover and nowhere else: a courier who could
    // start it earlier would be carrying a parcel the business hasn't given them.
    if (action === "start_delivery" && trip.status !== "picked_up") {
      return apiError(
        409,
        "conflict",
        trip.status === "in_progress"
          ? "This delivery has already started."
          : "Ask the business to confirm the pickup before starting the delivery.",
      );
    }

    if (action === "complete") {
      if (trip.status === "completed") {
        return apiError(409, "conflict", "Trip already completed.");
      }

      if (trip.status !== "in_progress") {
        return apiError(
          409,
          "conflict",
          "Start the delivery before completing it.",
        );
      }

      // A trip stored without a drop-off coordinate can't be checked against one.
      // Everything created since `POST /api/trips` started pinning the destination
      // has both; refusing the older rows would strand a real delivery over data
      // the courier never had a say in.
      if (trip.dropoffLatitude && trip.dropoffLongitude) {
        const proximity = await courierWithinRange(
          user.id,
          {
            lat: Number(trip.dropoffLatitude),
            lng: Number(trip.dropoffLongitude),
          },
          DELIVERY_PROXIMITY_KM,
          "drop-off",
        );

        if (!proximity.ok) {
          return apiError(409, "too_far", proximity.message);
        }
      }
    }

    const nextStatus = NEXT_STATUS[action];

    // Compare-and-swap on the status the checks above were made against. Between
    // the read and the write the row can have moved — a double-tapped "Complete",
    // or the business cancelling in the same instant — and a blind write would
    // apply a transition whose preconditions no longer hold, then report success.
    const moved = await applyTripChange(
      tripId,
      [
        eq(deliveryRequests.assignedCourierId, user.id),
        eq(deliveryRequests.status, trip.status),
      ],
      nextStatus === "completed"
        ? { status: nextStatus, completedAt: new Date() }
        : { status: nextStatus },
    );

    if (!moved) return tripMoved();

    await recordStatusChange(tripId, user.id, {
      from: trip.status,
      to: nextStatus,
      action,
    });

    return json({ ok: true, tripId, status: nextStatus });
  },
);
