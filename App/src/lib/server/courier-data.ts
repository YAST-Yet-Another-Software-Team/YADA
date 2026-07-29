import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from './db';
import { deliveryRequests, users } from './schema';

const ACTIVE_STATUSES = ['accepted', 'courier_arriving', 'arrived', 'in_progress'] as const;
const COMPLETED_STATUSES = ['completed', 'cancelled'] as const;

type TripRow = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLatitude: string | number | null;
  pickupLongitude: string | number | null;
  dropoffLatitude: string | number | null;
  dropoffLongitude: string | number | null;
  estimatedDistanceKm: string | number | null;
  estimatedDurationMinutes: string | number | null;
  requestedAt: Date;
  acceptedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  businessName: string;
};

type TripStatus = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

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
  status: TripStatus;
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

function asNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function toTripStatus(status: string): TripStatus {
  switch (status) {
    case 'requested':
      return 'searching';
    case 'accepted':
      return 'assigned';
    case 'courier_arriving':
    case 'in_progress':
      return 'en_route';
    case 'arrived':
      return 'arrived';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'searching';
  }
}

function formatAddressTrip(row: TripRow): CourierTrip {
  const estimatedDistanceKm = asNumber(row.estimatedDistanceKm);
  const estimatedDurationMinutes = asNumber(row.estimatedDurationMinutes);
  const payout = Math.max(7.5, Math.round(((estimatedDistanceKm ?? 1.5) * 3.75 + (estimatedDurationMinutes ?? 0) * 0.3) * 100) / 100);

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
    requestedAt: row.requestedAt.toISOString(),
    status: toTripStatus(row.status),
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    estimatedDistanceKm,
    estimatedDurationMinutes,
    estimatedPayout: payout
  };
}

function startOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function formatCourierMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export async function getCourierHomeData(userId: string, courierName: string) {
  if (!db) {
    return {
      profile: {
        name: courierName,
        initials: courierName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0] ?? '')
          .join('')
          .toUpperCase()
      },
      activeTrip: null,
      pendingRequests: [],
      summary: { walletBalance: 0, completedTrips: 0, tripsToday: 0, totalDistanceKm: 0, activeTrips: 0 }
    };
  }

  const [profileRow] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

  const activeRows = await db
    .select({
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
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(
      and(
        eq(deliveryRequests.assignedCourierId, userId),
        inArray(deliveryRequests.status, [...ACTIVE_STATUSES])
      )
    )
    .orderBy(desc(deliveryRequests.acceptedAt), desc(deliveryRequests.requestedAt))
    .limit(1);

  const activeTripRow = activeRows[0] ?? null;

  const pendingRows = await db
    .select({
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
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(and(eq(deliveryRequests.status, 'requested'), isNull(deliveryRequests.assignedCourierId)))
    .orderBy(desc(deliveryRequests.requestedAt));

  const completedRows = await db
    .select({
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
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(
      and(
        eq(deliveryRequests.assignedCourierId, userId),
        inArray(deliveryRequests.status, [...COMPLETED_STATUSES])
      )
    )
    .orderBy(desc(deliveryRequests.completedAt), desc(deliveryRequests.requestedAt));

  const completedTripRows = completedRows.filter((row) => row.status === 'completed');
  const completedTrips = completedTripRows.map(formatAddressTrip);
  const completedToday = completedTrips.filter(
    (trip) => trip.completedAt && new Date(trip.completedAt).getTime() >= startOfDay().getTime()
  );
  const walletBalance = Math.round(completedTrips.reduce((sum, trip) => sum + trip.estimatedPayout, 0) * 100) / 100;
  const totalDistanceKm = Math.round(
    completedTrips.reduce((sum, trip) => sum + (trip.estimatedDistanceKm ?? 0), 0) * 10
  ) / 10;

  return {
    profile: {
      name: profileRow?.name ?? courierName,
      initials: (profileRow?.name ?? courierName)
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase() || 'C'
    },
    activeTrip: activeTripRow ? formatAddressTrip(activeTripRow as TripRow) : null,
    pendingRequests: pendingRows.map((row) => ({
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
    })),
    summary: {
      walletBalance,
      completedTrips: completedTrips.length,
      tripsToday: completedToday.length,
      totalDistanceKm,
      activeTrips: activeTripRow ? 1 : 0
    }
  };
}

export async function getCourierTripById(userId: string, tripId?: string | null) {
  if (!db) return null;

  const query = db
    .select({
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
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : and(eq(deliveryRequests.assignedCourierId, userId), inArray(deliveryRequests.status, [...ACTIVE_STATUSES]))
    )
    .orderBy(desc(deliveryRequests.acceptedAt), desc(deliveryRequests.requestedAt))
    .limit(1);

  const [row] = await query;
  return row ? formatAddressTrip(row as TripRow) : null;
}

export async function getCourierLatestCompletedTrip(userId: string, tripId?: string | null) {
  if (!db) return null;

  const [row] = await db
    .select({
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
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(
      tripId
        ? and(eq(deliveryRequests.assignedCourierId, userId), eq(deliveryRequests.id, tripId))
        : and(
            eq(deliveryRequests.assignedCourierId, userId),
            inArray(deliveryRequests.status, [...COMPLETED_STATUSES])
          )
    )
    .orderBy(desc(deliveryRequests.completedAt), desc(deliveryRequests.requestedAt))
    .limit(1);

  return row ? formatAddressTrip(row as TripRow) : null;
}

export async function getCourierWeeklySeries(userId: string): Promise<CourierWeeklyBar[]> {
  if (!db) {
    return [];
  }

  const completedRows = await db
    .select({
      status: deliveryRequests.status,
      estimatedDistanceKm: deliveryRequests.estimatedDistanceKm,
      estimatedDurationMinutes: deliveryRequests.estimatedDurationMinutes,
      completedAt: deliveryRequests.completedAt
    })
    .from(deliveryRequests)
    .where(
      and(
        eq(deliveryRequests.assignedCourierId, userId),
        eq(deliveryRequests.status, 'completed')
      )
    );

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

  for (const row of completedRows) {
    if (!row.completedAt) continue;
    const completedAt = row.completedAt.getTime();
    const bucket = buckets.find((entry) => completedAt >= entry.start && completedAt < entry.end);
    if (!bucket) continue;

    const distance = asNumber(row.estimatedDistanceKm) ?? 0;
    const duration = asNumber(row.estimatedDurationMinutes) ?? 0;
    bucket.value = Math.round((bucket.value + Math.max(7.5, distance * 3.75 + duration * 0.3)) * 100) / 100;
    bucket.trips += 1;
  }

  return buckets.map(({ start, end, ...bar }) => bar);
}

export async function getCourierTripHistory(userId: string) {
  if (!db) {
    return {
      historyTrips: [],
      summary: { walletBalance: 0, completedTrips: 0, tripsToday: 0, totalDistanceKm: 0, activeTrips: 0 },
      weeklySeries: []
    };
  }

  const rows = await db
    .select({
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
    })
    .from(deliveryRequests)
    .innerJoin(users, eq(deliveryRequests.businessId, users.id))
    .where(and(eq(deliveryRequests.assignedCourierId, userId), inArray(deliveryRequests.status, [...COMPLETED_STATUSES])))
    .orderBy(desc(deliveryRequests.completedAt), desc(deliveryRequests.requestedAt));

  const historyTrips = rows.map(formatAddressTrip);
  const completedTrips = historyTrips.filter((trip) => trip.completedAt && trip.status === 'delivered');
  const tripsToday = completedTrips.filter((trip) => trip.completedAt && new Date(trip.completedAt).getTime() >= startOfDay().getTime());
  const weeklySeries = await getCourierWeeklySeries(userId);
  const walletBalance = Math.round(completedTrips.reduce((sum, trip) => sum + trip.estimatedPayout, 0) * 100) / 100;
  const totalDistanceKm = Math.round(completedTrips.reduce((sum, trip) => sum + (trip.estimatedDistanceKm ?? 0), 0) * 10) / 10;

  return {
    historyTrips,
    summary: {
      walletBalance,
      completedTrips: completedTrips.length,
      tripsToday: tripsToday.length,
      totalDistanceKm,
      activeTrips: 0
    },
    weeklySeries
  };
}
