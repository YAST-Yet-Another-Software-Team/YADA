import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import {
  ACTIVE_TRIP_STATUSES,
  CLOSED_TRIP_STATUSES,
  toTripStage,
  type TripStage
} from '$lib/shared/trip-status';
import { initials } from '$lib/shared/text';

import { db } from '../db';
import { deliveryRequests, users } from '../db/schema';

export type CourierRequest = {
  id: string;
  businessName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  notes: string | null;
  requestedAt: string;
};

export type CourierTrip = CourierRequest & {
  status: TripStage;
  acceptedAt: string | null;
  completedAt: string | null;
  estimatedDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
  estimatedPayout: number;
};

export type CourierHomeSummary = {
  walletBalance: number;
  completedTrips: number;
  tripsToday: number;
  totalDistanceKm: number;
  activeTrips: number;
};

export type CourierWeeklyBar = {
  label: string;
  value: number;
  trips: number;
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

/**
 * What a courier earns for a trip: a per-km rate plus a per-minute rate, with a
 * floor so short hops are still worth taking. Distance falls back to a typical
 * trip when it wasn't estimated, which matters because the floor no longer
 * covers it once the duration component is large.
 */
export function estimatePayout(
  distanceKm: number | null | undefined,
  durationMinutes: number | null | undefined
) {
  return Math.max(7.5, round((distanceKm ?? 1.5) * 3.75 + (durationMinutes ?? 0) * 0.3, 2));
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
  const estimatedDistanceKm = asNumber(row.estimatedDistanceKm);
  const estimatedDurationMinutes = asNumber(row.estimatedDurationMinutes);

  return {
    ...toCourierRequest(row),
    status: toTripStage(row.status),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    estimatedDistanceKm,
    estimatedDurationMinutes,
    estimatedPayout: estimatePayout(estimatedDistanceKm, estimatedDurationMinutes)
  };
}

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Wallet and trip totals, derived from the delivered trips in a set. */
function summarize(trips: CourierTrip[], activeTrips: number): CourierHomeSummary {
  const delivered = trips.filter((trip) => trip.status === 'delivered');
  const today = startOfToday();

  return {
    walletBalance: round(
      delivered.reduce((sum, trip) => sum + trip.estimatedPayout, 0),
      2
    ),
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

export function formatCourierMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
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

export async function getCourierHomeData(userId: string, courierName: string) {
  const [profileRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [activeRows, pendingRows, closedRows] = await Promise.all([
    tripQuery()
      .where(
        and(
          eq(deliveryRequests.assignedCourierId, userId),
          inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES])
        )
      )
      .orderBy(...byMostRecentlyAccepted)
      .limit(1),

    tripQuery()
      .where(
        and(eq(deliveryRequests.status, 'requested'), isNull(deliveryRequests.assignedCourierId))
      )
      .orderBy(desc(deliveryRequests.requestedAt)),

    tripQuery()
      .where(
        and(
          eq(deliveryRequests.assignedCourierId, userId),
          inArray(deliveryRequests.status, [...CLOSED_TRIP_STATUSES])
        )
      )
      .orderBy(...byMostRecentlyCompleted)
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
 * The courier's trip for the pickup/deliver screens: a specific one when an id
 * is given, otherwise whichever is currently live.
 */
export async function getCourierTripById(userId: string, tripId?: string | null) {
  const [row] = await tripQuery()
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : and(
            eq(deliveryRequests.assignedCourierId, userId),
            inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES])
          )
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
        : and(
            eq(deliveryRequests.assignedCourierId, userId),
            inArray(deliveryRequests.status, [...CLOSED_TRIP_STATUSES])
          )
    )
    .orderBy(...byMostRecentlyCompleted)
    .limit(1);

  return row ? toCourierTrip(row) : null;
}

/** Earnings for the last seven days, oldest bucket first. */
export function getCourierWeeklySeries(trips: CourierTrip[]): CourierWeeklyBar[] {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();

  const buckets = labels.map((label, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);

    return {
      label,
      value: 0,
      trips: 0,
      start: date.getTime(),
      end: date.getTime() + 24 * 60 * 60 * 1000
    };
  });

  for (const trip of trips) {
    if (trip.status !== 'delivered' || !trip.completedAt) continue;

    const completedAt = new Date(trip.completedAt).getTime();
    const bucket = buckets.find((entry) => completedAt >= entry.start && completedAt < entry.end);
    if (!bucket) continue;

    bucket.value = round(bucket.value + trip.estimatedPayout, 2);
    bucket.trips += 1;
  }

  return buckets.map(({ start, end, ...bar }) => bar);
}

export async function getCourierTripHistory(userId: string) {
  const rows = await tripQuery()
    .where(
      and(
        eq(deliveryRequests.assignedCourierId, userId),
        inArray(deliveryRequests.status, [...CLOSED_TRIP_STATUSES])
      )
    )
    .orderBy(...byMostRecentlyCompleted);

  const historyTrips = rows.map(toCourierTrip);

  return {
    historyTrips,
    summary: summarize(historyTrips, 0),
    weeklySeries: getCourierWeeklySeries(historyTrips)
  };
}
