import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { and, eq, inArray } from "drizzle-orm";

import { apiError, apiRoute, readJsonBody } from "$lib/server/api-guard";
import { MATCH_LOCATION_FRESH_MS } from "$lib/server/data/matching";
import { applyTripChange } from "$lib/server/data/trip-transition";
import { db } from "$lib/server/db";
import { toCoordinateColumn } from "$lib/server/db/columns";
import { courierProfiles, deliveryRequests } from "$lib/server/db/schema";
import {
  recordStatusChange,
  recordTripEvent,
} from "$lib/server/data/trip-events";
import { geoErrorMessage } from "$lib/shared/geo/errors";
import { isWithinRange, PICKUP_PROXIMITY_KM } from "$lib/shared/geo/proximity";
import { getIo } from "$lib/server/realtime/instance";
import { ACTIVE_TRIP_STATUSES } from "$lib/shared/trip-status";
import { isUuid } from "$lib/shared/uuid";

type LocationBody = {
  lat?: number;
  lng?: number;
  heading?: number;
  tripId?: string;
  recordedAt?: string;
};

/**
 * When the fix was taken, as the client reports it — but never taken on trust.
 *
 * `last_location_at` is the column dispatch reads to decide whether a courier
 * is locatable at all, and the one both handover confirmations gate on. A
 * client free to name its own time could therefore keep a long-stale position
 * permanently "fresh" by posting a future timestamp, and go on being ringed for
 * deliveries from wherever it last felt like being.
 *
 * So the value is only honoured when it is plausible: parseable, not in the
 * future, and no older than the window anything downstream would believe. Every
 * other case — including the unparseable string that used to reach the
 * timestamp column and turn the whole request into a 500 — falls back to the
 * server's clock, which is the one thing here a caller cannot influence. A fix
 * timed on arrival is at worst a few seconds out.
 */
function toRecordedAt(value: unknown) {
  const now = Date.now();
  if (typeof value !== "string") return new Date(now);

  const reported = new Date(value).getTime();
  if (Number.isNaN(reported)) return new Date(now);
  if (reported > now || now - reported > MATCH_LOCATION_FRESH_MS)
    return new Date(now);

  return new Date(reported);
}

export const POST: RequestHandler = apiRoute(
  { role: "courier" },
  async ({ request }, user) => {
    const body = (await readJsonBody<LocationBody>(request)) ?? {};
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return apiError(
        400,
        "invalid_request",
        geoErrorMessage("invalid_request"),
      );
    }

    const recordedAt = toRecordedAt(body.recordedAt);

    await db
      .update(courierProfiles)
      .set({
        currentLatitude: toCoordinateColumn(lat),
        currentLongitude: toCoordinateColumn(lng),
        lastLocationAt: recordedAt,
        updatedAt: new Date(),
      })
      .where(eq(courierProfiles.userId, user.id));

    // A tripId is only honoured if it's this courier's own live trip; anything
    // else is dropped so a stale id can't attach fixes to someone's delivery.
    // Screening the shape first keeps a malformed id out of the uuid column,
    // where Postgres would raise rather than simply not match.
    let tripId = isUuid(body.tripId) ? body.tripId : null;
    if (tripId) {
      const [trip] = await db
        .select({
          id: deliveryRequests.id,
          status: deliveryRequests.status,
          pickupLatitude: deliveryRequests.pickupLatitude,
          pickupLongitude: deliveryRequests.pickupLongitude,
        })
        .from(deliveryRequests)
        .where(
          and(
            eq(deliveryRequests.id, tripId),
            eq(deliveryRequests.assignedCourierId, user.id),
            inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES]),
          ),
        )
        .limit(1);

      if (!trip) {
        tripId = null;
      } else {
        await recordTripEvent(trip.id, user.id, "rider_location", {
          lat,
          lng,
          heading: body.heading ?? null,
          recordedAt: recordedAt.toISOString(),
        });

        // Reaching the pickup is observed, not declared: the courier's own
        // position is what tells the business their rider is at the counter and
        // the handover can be confirmed. Doing it here costs nothing — the trip
        // row is already loaded — and means neither app has to remember to say so.
        if (
          trip.status === "accepted" &&
          trip.pickupLatitude &&
          trip.pickupLongitude &&
          isWithinRange(
            { lat, lng },
            {
              lat: Number(trip.pickupLatitude),
              lng: Number(trip.pickupLongitude),
            },
            PICKUP_PROXIMITY_KM,
          )
        ) {
          // Conditional, like every other transition: two fixes arriving together
          // would otherwise both write the arrival and both log it.
          const arrived = await applyTripChange(
            trip.id,
            [
              eq(deliveryRequests.assignedCourierId, user.id),
              eq(deliveryRequests.status, trip.status),
            ],
            { status: "courier_arriving" },
          );

          if (arrived) {
            await recordStatusChange(trip.id, user.id, {
              from: trip.status,
              to: "courier_arriving",
              action: "reached_pickup",
            });
          }
        }
      }
    }

    const payload = {
      courierId: user.id,
      tripId,
      lat,
      lng,
      heading: body.heading ?? null,
      recordedAt: recordedAt.toISOString(),
    };

    // Only the trip's own room; membership is verified per join against
    // GET /api/trips?id=, so a fix only reaches that delivery's participants.
    const io = getIo();
    if (io && tripId) {
      io.to(`trip:${tripId}`).emit("rider:location", payload);
    }

    return json({ ok: true, location: payload });
  },
);
