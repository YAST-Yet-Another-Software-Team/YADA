import { and, eq } from "drizzle-orm";

import type { CourierTrip } from "$lib/utils/types";

import { db } from "../db";
import { round } from "../db/columns";
import { deliveryRequests, users } from "../db/schema";
import { courierProfileOf } from "./courier-profile";
import {
  activeTripsFor,
  byMostRecentlyAccepted,
  byMostRecentlyCompleted,
  closedTripsFor,
  toCourierTrip,
  tripQuery,
} from "./courier-trip-query";
import { ringingRequestRows, toCourierOffer } from "./dispatch";
import { ratingByRaterForTrip, ratingsByRaterFor } from "./ratings";

/**
 * The reads behind each courier screen — Home, Orders, Pickup/Deliver, the
 * completion screen and Trips.
 *
 * One function per screen rather than a general trip finder, because each
 * screen wants a deliberately different amount: Orders skips the profile and
 * the lifetime summary it doesn't render, and only the two completed-trip reads
 * pay for the rating lookup.
 */

export type CourierHomeSummary = {
  completedTrips: number;
  tripsToday: number;
  totalDistanceKm: number;
  activeTrips: number;
};

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Delivery counts and distance covered, derived from the delivered trips in a set. */
function summarize(
  trips: CourierTrip[],
  activeTrips: number,
): CourierHomeSummary {
  const delivered = trips.filter((trip) => trip.status === "completed");
  const today = startOfToday();

  return {
    completedTrips: delivered.length,
    tripsToday: delivered.filter(
      (trip) =>
        trip.completedAt && new Date(trip.completedAt).getTime() >= today,
    ).length,
    totalDistanceKm: round(
      delivered.reduce((sum, trip) => sum + (trip.estimatedDistanceKm ?? 0), 0),
      1,
    ),
    activeTrips,
  };
}

export async function getCourierHomeData(userId: string, courierName: string) {
  const [profileRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // The active trip first: whether this courier is busy changes which requests
  // ring them at all.
  const [activeRows, closedRows] = await Promise.all([
    tripQuery()
      .where(activeTripsFor(userId))
      .orderBy(...byMostRecentlyAccepted)
      .limit(1),
    tripQuery()
      .where(closedTripsFor(userId))
      .orderBy(...byMostRecentlyCompleted),
  ]);

  const activeTripRow = activeRows[0] ?? null;
  const pendingRows = await ringingRequestRows(userId, activeTripRow);

  return {
    profile: courierProfileOf(profileRow?.name ?? courierName),
    activeTrip: activeTripRow ? toCourierTrip(activeTripRow) : null,
    pendingRequests: pendingRows.map(toCourierOffer),
    summary: summarize(closedRows.map(toCourierTrip), activeTripRow ? 1 : 0),
  };
}

/**
 * The Orders tab: what this courier is carrying right now, plus the offers
 * currently ringing them. Deliberately narrower than `getCourierHomeData` — no
 * profile and no lifetime summary, neither of which the screen renders.
 */
export async function getCourierOrdersData(userId: string) {
  const activeRows = await tripQuery()
    .where(activeTripsFor(userId))
    .orderBy(...byMostRecentlyAccepted)
    .limit(1);

  const activeTripRow = activeRows[0] ?? null;
  const pendingRows = await ringingRequestRows(userId, activeTripRow);

  return {
    activeTrip: activeTripRow ? toCourierTrip(activeTripRow) : null,
    pendingRequests: pendingRows.map(toCourierOffer),
  };
}

/**
 * The courier's trip for the pickup/deliver screens: a specific one when an id
 * is given, otherwise whichever is currently live.
 */
export async function getCourierTripById(
  userId: string,
  tripId?: string | null,
) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(
            eq(deliveryRequests.assignedCourierId, userId),
            eq(deliveryRequests.id, tripId),
          )
        : activeTripsFor(userId),
    )
    .orderBy(...byMostRecentlyAccepted)
    .limit(1);

  return row ? toCourierTrip(row) : null;
}

export async function getCourierLatestCompletedTrip(
  userId: string,
  tripId?: string | null,
) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(
            eq(deliveryRequests.assignedCourierId, userId),
            eq(deliveryRequests.id, tripId),
          )
        : closedTripsFor(userId),
    )
    .orderBy(...byMostRecentlyCompleted)
    .limit(1);

  if (!row) return null;

  // The completion screen offers the business its stars, so it has to know
  // whether this rider already gave them — otherwise a reload after rating
  // hands them a fresh form that the API will then reject as a duplicate.
  return toCourierTrip(row, await ratingByRaterForTrip(userId, row.id));
}

export async function getCourierTripHistory(userId: string) {
  const rows = await tripQuery()
    .where(closedTripsFor(userId))
    .orderBy(...byMostRecentlyCompleted);

  // One read for the whole page rather than one per card.
  const myRatings = await ratingsByRaterFor(
    userId,
    rows.map((row) => row.id),
  );

  const historyTrips = rows.map((row) =>
    toCourierTrip(row, myRatings.get(row.id) ?? null),
  );

  return {
    historyTrips,
    summary: summarize(historyTrips, 0),
  };
}
