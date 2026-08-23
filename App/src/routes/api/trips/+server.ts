import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { apiError, apiRoute, readJsonBody } from "$lib/server/api-guard";
import {
  getBusinessAddress,
  getCourierSummary,
} from "$lib/server/data/business";
import { getCourierFix } from "$lib/server/data/courier-location";
import { ratingByRaterForTrip } from "$lib/server/data/ratings";
import { db } from "$lib/server/db";
import { asNumber, toCoordinateColumn } from "$lib/server/db/columns";
import { deliveryRequests, tripEvents } from "$lib/server/db/schema";
import { containsPoint } from "$lib/shared/geo/service-area";
import { GeoError, geoErrorMessage } from "$lib/shared/geo/errors";
import { isUuid } from "$lib/shared/uuid";
import { env } from "$env/dynamic/private";

/**
 * Only the destination comes off the wire. Pickup is the business's stored
 * address, read here rather than accepted from the client: the business doesn't
 * move, so letting a request nominate its own origin would only ever be a way to
 * disagree with the profile.
 */
type CreateTripBody = {
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  orderName?: string;
  orderPrice?: number | string;
  notes?: string;
  estimatedDistanceKm?: number;
  estimatedDurationMinutes?: number;
};

/** Long enough for "2× large pancakes + syrup", short enough to read on a row. */
const MAX_ORDER_NAME = 120;

/**
 * The ceiling on a single order's declared value, in cedis.
 *
 * Not a business rule about what YADA will carry — it is the guard that keeps a
 * fat-fingered amount out of a `numeric(10, 2)` column, which tops out at eight
 * digits before the point.
 */
const MAX_ORDER_PRICE = 1_000_000;

/**
 * The order's value, as the column stores it.
 *
 * Accepts a number or the string a form sends, and refuses anything that isn't
 * a finite, non-negative amount. Rounded to the two decimal places the column
 * keeps, here rather than in the database, so what is stored is what the API
 * agreed to rather than a silent truncation.
 */
function toPriceColumn(value: unknown) {
  const amount =
    typeof value === "string" ? Number(value.trim()) : Number(value);

  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_ORDER_PRICE)
    return null;

  return amount.toFixed(2);
}

export const POST: RequestHandler = apiRoute(
  { role: "business", verifiedFor: "sending a delivery" },
  async ({ request }, user) => {
    try {
      const business = await getBusinessAddress(user.id);
      if (!business) {
        return apiError(
          409,
          "no_business_address",
          "Set your business address before requesting a delivery.",
        );
      }

      const body = (await readJsonBody<CreateTripBody>(request)) ?? {};
      const dropoffAddress = body.dropoffAddress?.trim();
      const dropoffLat = Number(body.dropoffLat);
      const dropoffLng = Number(body.dropoffLng);

      if (
        !dropoffAddress ||
        !Number.isFinite(dropoffLat) ||
        !Number.isFinite(dropoffLng)
      ) {
        return apiError(
          400,
          "invalid_request",
          geoErrorMessage("invalid_request"),
        );
      }

      // The order record. Checked here and not only on the form, because the
      // columns are NOT NULL and a request without them is one nobody can audit
      // afterwards — which is the whole reason they exist.
      const orderName = body.orderName?.trim();
      if (!orderName) {
        return apiError(400, "invalid_request", "Say what is being sent.");
      }

      if (orderName.length > MAX_ORDER_NAME) {
        return apiError(400, "invalid_request", "That order name is too long.");
      }

      const orderPrice = toPriceColumn(body.orderPrice);
      if (orderPrice === null) {
        return apiError(
          400,
          "invalid_request",
          "Enter what the order is worth, in cedis.",
        );
      }

      // Neither end is zone-checked. A delivery that starts or finishes outside
      // KNUST/Ayeduase is still a delivery someone wants; whether a courier
      // takes it is the courier's call, which is what the offer ring is for.

      const [trip] = await db
        .insert(deliveryRequests)
        .values({
          businessId: user.id,
          status: "requested",
          pickupAddress: business.address,
          dropoffAddress,
          pickupLatitude: toCoordinateColumn(business.lat),
          pickupLongitude: toCoordinateColumn(business.lng),
          dropoffLatitude: toCoordinateColumn(dropoffLat),
          dropoffLongitude: toCoordinateColumn(dropoffLng),
          orderName,
          orderPrice,
          notes: body.notes ?? null,
          estimatedDistanceKm:
            body.estimatedDistanceKm != null
              ? String(body.estimatedDistanceKm)
              : null,
          estimatedDurationMinutes:
            body.estimatedDurationMinutes != null
              ? String(body.estimatedDurationMinutes)
              : null,
        })
        .returning();

      await db.insert(tripEvents).values({
        tripId: trip.id,
        actorId: user.id,
        eventType: "trip_created",
        payload: JSON.stringify({
          pickup: { lat: business.lat, lng: business.lng },
          dropoff: { lat: dropoffLat, lng: dropoffLng },
          // Recorded so a trip with no stored ETA can be told apart later from
          // one where routing was simply unconfigured. Maps, geocoding and
          // routing all bill against the one Google key, so it answers for all
          // three.
          routingConfigured: Boolean(env.GOOGLE_MAPS_API_KEY),
        }),
      });

      return json({
        ok: true,
        trip: {
          id: trip.id,
          status: trip.status,
          pickupAddress: trip.pickupAddress,
          dropoffAddress: trip.dropoffAddress,
          pickupLat: business.lat,
          pickupLng: business.lng,
          dropoffLat,
          dropoffLng,
          estimatedDistanceKm: body.estimatedDistanceKm ?? null,
          estimatedDurationMinutes: body.estimatedDurationMinutes ?? null,
        },
      });
    } catch (error) {
      if (error instanceof GeoError) {
        return apiError(422, error.code, error.message);
      }
      console.error("create trip failed", error);
      return apiError(502, "unavailable", geoErrorMessage("unavailable"));
    }
  },
);

/**
 * One trip, for whoever is on it.
 *
 * The tracking screen polls this every few seconds and the courier screens read
 * it too, so it is the single place that decides what each side of a delivery is
 * allowed to know about it.
 */
export const GET: RequestHandler = apiRoute({}, async ({ url }, user) => {
  const tripId = url.searchParams.get("id");
  if (!isUuid(tripId)) {
    return apiError(400, "invalid_request", geoErrorMessage("invalid_request"));
  }

  const [trip] = await db
    .select()
    .from(deliveryRequests)
    .where(eq(deliveryRequests.id, tripId))
    .limit(1);

  // Scope the trip to its participants — a valid session alone must not grant
  // read access to another business's delivery, addresses included. 404 rather
  // than 403, so a miss doesn't confirm the id exists.
  const isParticipant =
    trip?.businessId === user.id || trip?.assignedCourierId === user.id;
  if (!trip || !isParticipant) {
    return apiError(404, "no_results", "Trip not found.");
  }

  // Whoever is carrying the parcel, named from the account rather than left to
  // the tracking screen to invent. Absent until someone accepts.
  //
  // Their last stored position rides along so the tracking map can focus on the
  // rider the moment a match happens. Live updates arrive over the socket where
  // there is one, but the first is however long the courier's next fix is away —
  // without this a freshly matched business watches an empty map until then.
  const courier = trip.assignedCourierId
    ? await getCourierSummary(trip.assignedCourierId)
    : null;
  const courierFix = trip.assignedCourierId
    ? await getCourierFix(trip.assignedCourierId)
    : null;

  // Whether *this viewer* has already rated the trip, so their screen offers the
  // stars once and shows them read-only ever after. Asked for either participant
  // now that both directions exist — the row is keyed by rater, so the business's
  // verdict and the rider's are separate answers and neither can be mistaken for
  // the other.
  const myRating =
    trip.status === "completed"
      ? await ratingByRaterForTrip(user.id, trip.id)
      : null;

  const pickupLat = asNumber(trip.pickupLatitude);
  const pickupLng = asNumber(trip.pickupLongitude);
  const dropoffLat = asNumber(trip.dropoffLatitude);
  const dropoffLng = asNumber(trip.dropoffLongitude);

  // The order record is the sender's own, and the rider has no business knowing
  // what the parcel is worth — they are carrying it either way, and a value on
  // their screen is a reason to be robbed for it. Both fields stay on the
  // business's side of this response.
  const isBusiness = user.id === trip.businessId;

  return json({
    ok: true,
    trip: {
      id: trip.id,
      status: trip.status,
      businessId: trip.businessId,
      assignedCourierId: trip.assignedCourierId,
      courier,
      myRating,
      orderName: isBusiness ? trip.orderName : null,
      orderPrice: isBusiness ? asNumber(trip.orderPrice) : null,
      /**
       * A rider took this and then dropped it before reaching the counter, so it
       * is out ringing again. Inferred rather than stored: `accepted_at` survives
       * the release and the next acceptance overwrites it, so a searching trip
       * that has one is a trip that lost a rider.
       */
      releasedByCourier:
        isBusiness && trip.status === "requested" && trip.acceptedAt !== null,
      // Elapsed rather than the timestamp, so the tracking screen's ring display
      // doesn't inherit the browser's clock skew.
      dispatchElapsedSeconds:
        trip.status === "requested"
          ? Math.floor((Date.now() - trip.dispatchStartedAt.getTime()) / 1000)
          : null,
      courierLocation: courierFix
        ? {
            lat: courierFix.point.lat,
            lng: courierFix.point.lng,
            recordedAt: courierFix.recordedAt.toISOString(),
          }
        : null,
      pickupAddress: trip.pickupAddress,
      dropoffAddress: trip.dropoffAddress,
      // When the parcel actually landed, for the completion screen. ISO rather
      // than a formatted string: the client knows the viewer's locale and
      // timezone, and the server does not.
      completedAt: trip.completedAt ? trip.completedAt.toISOString() : null,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      estimatedDistanceKm: asNumber(trip.estimatedDistanceKm),
      estimatedDurationMinutes: asNumber(trip.estimatedDurationMinutes),
      pickupInZone:
        pickupLat != null && pickupLng != null
          ? containsPoint({ lat: pickupLat, lng: pickupLng })
          : false,
      dropoffInZone:
        dropoffLat != null && dropoffLng != null
          ? containsPoint({ lat: dropoffLat, lng: dropoffLng })
          : false,
    },
  });
});
