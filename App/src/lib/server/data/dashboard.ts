import { desc, eq, inArray } from "drizzle-orm";

import { formatRideTimeBetween } from "$lib/shared/ride-time";
import { toDispatchStage } from "$lib/shared/trip-status";
import type { DashboardTripRecord } from "$lib/utils/types";

import { db } from "../db";
import { businessProfiles, deliveryRequests, users } from "../db/schema";
import { ratingsByRaterFor } from "./ratings";

/**
 * Names for the couriers on a set of trips.
 *
 * A second query rather than a second join on `users`: the board is a handful
 * of rows with a handful of distinct riders between them, and one small `IN`
 * reads better than aliasing the same table twice in the main projection.
 */
async function courierNamesFor(courierIds: string[]) {
  const unique = [...new Set(courierIds)];
  if (unique.length === 0) return new Map<string, string>();

  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, unique));

  return new Map(rows.map((row) => [row.id, row.name]));
}

function formatTripId(id: string) {
  return id.startsWith("YD-") ? id : `YD-${id.slice(0, 4).toUpperCase()}`;
}

function formatTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function getDashboardTrips(ownerId: string) {
  const records = await db
    .select({
      id: deliveryRequests.id,
      businessId: deliveryRequests.businessId,
      assignedCourierId: deliveryRequests.assignedCourierId,
      status: deliveryRequests.status,
      pickupAddress: deliveryRequests.pickupAddress,
      dropoffAddress: deliveryRequests.dropoffAddress,
      pickupLatitude: deliveryRequests.pickupLatitude,
      pickupLongitude: deliveryRequests.pickupLongitude,
      dropoffLatitude: deliveryRequests.dropoffLatitude,
      dropoffLongitude: deliveryRequests.dropoffLongitude,
      orderName: deliveryRequests.orderName,
      orderPrice: deliveryRequests.orderPrice,
      notes: deliveryRequests.notes,
      requestedAt: deliveryRequests.requestedAt,
      dispatchStartedAt: deliveryRequests.dispatchStartedAt,
      acceptedAt: deliveryRequests.acceptedAt,
      completedAt: deliveryRequests.completedAt,
      businessName: users.name,
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(eq(deliveryRequests.businessId, ownerId))
    .orderBy(desc(deliveryRequests.requestedAt));

  const businessProfileRow = (
    await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, ownerId))
      .limit(1)
  )[0];

  const courierNames = await courierNamesFor(
    records
      .map((record) => record.assignedCourierId)
      .filter((id): id is string => id != null),
  );

  // Which of these trips the business has already rated, so History offers the
  // stars exactly once per delivery.
  const myRatings = await ratingsByRaterFor(
    ownerId,
    records.map((record) => record.id),
  );

  const mapped = records.map((record) => {
    const baseId = formatTripId(record.id);
    const status = toDispatchStage(record.status);
    const completedAt = record.completedAt
      ? formatTime(record.completedAt)
      : null;
    return {
      id: baseId,
      rawId: record.id,
      // The rider by name. It used to be the word "Courier" for everyone, which
      // read as a real answer while telling the business nothing.
      rider: record.assignedCourierId
        ? (courierNames.get(record.assignedCourierId) ?? "Courier")
        : null,
      destination: record.dropoffAddress,
      pickup: record.pickupAddress,
      // The measured ride, not the forecast one. Null while a trip is still
      // running or was never accepted, because there is no elapsed time to
      // report yet — deliberately not falling back to the estimate, which is
      // the thing this replaced.
      rideTime: formatRideTimeBetween(record.acceptedAt, record.completedAt),
      status,
      dispatchStartedAt: record.dispatchStartedAt
        ? record.dispatchStartedAt.toISOString()
        : null,
      completedAt,
      orderName: record.orderName,
      orderPrice: Number(record.orderPrice),
      notes: record.notes,
      myRating: myRatings.get(record.id) ?? null,
      pickupLat:
        record.pickupLatitude != null ? Number(record.pickupLatitude) : null,
      pickupLng:
        record.pickupLongitude != null ? Number(record.pickupLongitude) : null,
      dropoffLat:
        record.dropoffLatitude != null ? Number(record.dropoffLatitude) : null,
      dropoffLng:
        record.dropoffLongitude != null
          ? Number(record.dropoffLongitude)
          : null,
    } satisfies DashboardTripRecord;
  });

  const activeTrips = mapped.filter(
    (trip) => trip.status !== "delivered" && trip.status !== "cancelled",
  );
  const historyTrips = mapped.filter(
    (trip) => trip.status === "delivered" || trip.status === "cancelled",
  );

  return {
    businessProfile: businessProfileRow
      ? {
          name: businessProfileRow.businessName,
          businessName: businessProfileRow.businessName,
          email: null,
          phone: null,
          address: businessProfileRow.address,
          lat: Number(businessProfileRow.latitude),
          lng: Number(businessProfileRow.longitude),
        }
      : null,
    activeTrips,
    historyTrips,
  };
}
