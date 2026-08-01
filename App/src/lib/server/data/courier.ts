import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { ACTIVE_TRIP_STATUSES, CLOSED_TRIP_STATUSES } from '$lib/shared/trip-status';
import { initials } from '$lib/shared/text';
import type { CourierRequest, CourierTrip } from '$lib/utils/types';

import { db } from '../db';
import { deliveryRequests, users } from '../db/schema';

export type CourierHomeSummary = {
  completedTrips: number;
  tripsToday: number;
  totalDistanceKm: number;
  activeTrips: number;
};

// ---------------------------------------------------------------------------
// Query building
// ---------------------------------------------------------------------------

/**
 * Every courier-facing trip query reads the same columns and joins the same
 * business name, so the projection lives here once rather than being spelled
 * out at each call site.
 */
const tripColumns = {
  id: deliveryRequests.id,
  status: deliveryRequests.status,
  pickupAddress: deliveryRequests.pickupAddress,
  dropoffAddress: deliveryRequests.dropoffAddress,
  pickupLatitude: deliveryRequests.pickupLatitude,
  pickupLongitude: deliveryRequests.pickupLongitude,
  dropoffLatitude: deliveryRequests.dropoffLatitude,
  dropoffLongitude: deliveryRequests.dropoffLongitude,
  estimatedDistanceKm: deliveryRequests.estimatedDistanceKm,
  estimatedDurationMinutes: deliveryRequests.estimatedDurationMinutes,
  requestedAt: deliveryRequests.requestedAt,
  acceptedAt: deliveryRequests.acceptedAt,
  completedAt: deliveryRequests.completedAt,
  notes: deliveryRequests.notes,
  businessName: users.name
};

function tripQuery() {
  return db
    .select(tripColumns)
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id));
}

type TripRow = Awaited<ReturnType<ReturnType<typeof tripQuery>['execute']>>[number];

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** `numeric` columns come back from the driver as strings. */
function asNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toCourierRequest(row: TripRow): CourierRequest {
  return {
    id: row.id,
    businessName: row.businessName,
    pickupAddress: row.pickupAddress,
    dropoffAddress: row.dropoffAddress,
    pickupLat: asNumber(row.pickupLatitude),
    pickupLng: asNumber(row.pickupLongitude),
    dropoffLat: asNumber(row.dropoffLatitude),
    dropoffLng: asNumber(row.dropoffLongitude),
    notes: row.notes,
    requestedAt: row.requestedAt.toISOString()
  };
}

function toCourierTrip(row: TripRow): CourierTrip {
  return {
    ...toCourierRequest(row),
    // The stored status, not a display stage: the pickup screen has to tell
    // "waiting to be handed the parcel" from "cleared to set off".
    status: row.status,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    estimatedDistanceKm: asNumber(row.estimatedDistanceKm),
    estimatedDurationMinutes: asNumber(row.estimatedDurationMinutes)
  };
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Delivery counts and distance covered, derived from the delivered trips in a set. */
function summarize(trips: CourierTrip[], activeTrips: number): CourierHomeSummary {
  const delivered = trips.filter((trip) => trip.status === 'completed');
  const today = startOfToday();

  return {
    completedTrips: delivered.length,
    tripsToday: delivered.filter(
      (trip) => trip.completedAt && new Date(trip.completedAt).getTime() >= today
    ).length,
    totalDistanceKm: round(
      delivered.reduce((sum, trip) => sum + (trip.estimatedDistanceKm ?? 0), 0),
      1
    ),
    activeTrips
  };
}

export function courierProfileOf(name: string | null | undefined, fallback = 'Courier') {
  const displayName = name || fallback;
  return { name: displayName, initials: initials(displayName, 'C') };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const byMostRecentlyAccepted = [
  desc(deliveryRequests.acceptedAt),
  desc(deliveryRequests.requestedAt)
] as const;

const byMostRecentlyCompleted = [
  desc(deliveryRequests.completedAt),
  desc(deliveryRequests.requestedAt)
] as const;

/** The trip this courier is currently on the hook for. */
const activeTripsFor = (userId: string) =>
  and(
    eq(deliveryRequests.assignedCourierId, userId),
    inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES])
  );

/** Everything this courier has finished, delivered or cancelled. */
const closedTripsFor = (userId: string) =>
  and(
    eq(deliveryRequests.assignedCourierId, userId),
    inArray(deliveryRequests.status, [...CLOSED_TRIP_STATUSES])
  );

/** Offers on the board: requested, nobody assigned yet. Not courier-scoped. */
const openRequests = () =>
  and(eq(deliveryRequests.status, 'requested'), isNull(deliveryRequests.assignedCourierId));

export async function getCourierHomeData(userId: string, courierName: string) {
  const [profileRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [activeRows, pendingRows, closedRows] = await Promise.all([
    tripQuery().where(activeTripsFor(userId)).orderBy(...byMostRecentlyAccepted).limit(1),
    tripQuery().where(openRequests()).orderBy(desc(deliveryRequests.requestedAt)),
    tripQuery().where(closedTripsFor(userId)).orderBy(...byMostRecentlyCompleted)
  ]);

  const activeTripRow = activeRows[0] ?? null;

  return {
    profile: courierProfileOf(profileRow?.name ?? courierName),
    activeTrip: activeTripRow ? toCourierTrip(activeTripRow) : null,
    pendingRequests: pendingRows.map(toCourierRequest),
    summary: summarize(closedRows.map(toCourierTrip), activeTripRow ? 1 : 0)
  };
}

/**
 * The Orders tab: what this courier is carrying right now, plus the offers still
 * on the board. Deliberately narrower than `getCourierHomeData` — no profile and
 * no lifetime summary, neither of which the screen renders.
 */
export async function getCourierOrdersData(userId: string) {
  const [activeRows, pendingRows] = await Promise.all([
    tripQuery().where(activeTripsFor(userId)).orderBy(...byMostRecentlyAccepted).limit(1),
    tripQuery().where(openRequests()).orderBy(desc(deliveryRequests.requestedAt))
  ]);

  return {
    activeTrip: activeRows[0] ? toCourierTrip(activeRows[0]) : null,
    pendingRequests: pendingRows.map(toCourierRequest)
  };
}

/**
 * The courier's trip for the pickup/deliver screens: a specific one when an id
 * is given, otherwise whichever is currently live.
 */
export async function getCourierTripById(userId: string, tripId?: string | null) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : activeTripsFor(userId)
    )
    .orderBy(...byMostRecentlyAccepted)
    .limit(1);

  return row ? toCourierTrip(row) : null;
}

export async function getCourierLatestCompletedTrip(userId: string, tripId?: string | null) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : closedTripsFor(userId)
    )
    .orderBy(...byMostRecentlyCompleted)
    .limit(1);

  return row ? toCourierTrip(row) : null;
}

export async function getCourierTripHistory(userId: string) {
  const rows = await tripQuery()
    .where(closedTripsFor(userId))
    .orderBy(...byMostRecentlyCompleted);

  const historyTrips = rows.map(toCourierTrip);

  return {
    historyTrips,
    summary: summarize(historyTrips, 0)
  };
}
