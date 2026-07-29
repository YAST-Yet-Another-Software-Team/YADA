import { desc, eq } from 'drizzle-orm';

import { db } from './db';
import { businessProfiles, deliveryRequests, users } from './schema';

export type DispatchUser = {
  id: string;
  name: string;
  email: string | null;
  role: 'business' | 'courier' | 'admin';
  image: string | null;
};

export type DispatchBusinessProfile = {
  businessName: string;
  address: string;
  mapX: number;
  mapY: number;
};

export type DispatchTrip = {
  id: string;
  rider: string | null;
  destination: string;
  pickup: string | null;
  eta: string | null;
  status: 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';
  completedAt: string | null;
  notes: string | null;
  mapX: number | null;
  mapY: number | null;
};

function asNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

function mapTripStatus(status: string): DispatchTrip['status'] {
  switch (status) {
    case 'requested':
      return 'searching';
    case 'accepted':
      return 'assigned';
    case 'courier_arriving':
    case 'arrived':
    case 'in_progress':
      return 'en_route';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'searching';
  }
}

export async function getDispatchUser(email?: string | null): Promise<DispatchUser | null> {
  if (!db) return null;

  const rows = await db.select().from(users).where(email ? eq(users.email, email) : undefined).limit(1);
  const user = rows[0];

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    role: user.role,
    image: user.image ?? null
  };
}

export async function getBusinessProfile(userId?: string | null): Promise<DispatchBusinessProfile | null> {
  if (!db || !userId) return null;

  const rows = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1);
  const profile = rows[0];

  if (!profile) return null;

  return {
    businessName: profile.businessName,
    address: profile.address,
    mapX: asNumber(profile.latitude) ?? 0,
    mapY: asNumber(profile.longitude) ?? 0
  };
}

export async function getDispatchTrips(userId?: string | null) {
  if (!db || !userId) return { activeTrips: [], historyTrips: [], dashboardStats: { activeDeliveries: 0, avgPickupTime: '0 min', deliveredToday: 0 } };

  const requests = await db
    .select({
      id: deliveryRequests.id,
      status: deliveryRequests.status,
      pickupAddress: deliveryRequests.pickupAddress,
      dropoffAddress: deliveryRequests.dropoffAddress,
      notes: deliveryRequests.notes,
      requestedAt: deliveryRequests.requestedAt,
      acceptedAt: deliveryRequests.acceptedAt,
      completedAt: deliveryRequests.completedAt,
      assignedCourierId: deliveryRequests.assignedCourierId
    })
    .from(deliveryRequests)
    .where(eq(deliveryRequests.businessId, userId))
    .orderBy(desc(deliveryRequests.requestedAt));

  const activeTrips = requests.filter((request) => request.status !== 'completed' && request.status !== 'cancelled').map((request, index) => ({
    id: request.id,
    rider: request.assignedCourierId ? 'Test rider' : null,
    destination: request.dropoffAddress,
    pickup: request.pickupAddress,
    eta: request.assignedCourierId ? `${Math.max(4, 9 - index)} min` : null,
    status: mapTripStatus(request.status),
    completedAt: null,
    notes: request.notes,
    mapX: 30 + index * 12,
    mapY: 40 + index * 4
  }));

  const historyTrips = requests.filter((request) => request.status === 'completed' || request.status === 'cancelled').map((request, index) => ({
    id: request.id,
    rider: request.assignedCourierId ? 'Test rider' : null,
    destination: request.dropoffAddress,
    pickup: request.pickupAddress,
    eta: null,
    status: mapTripStatus(request.status),
    completedAt: request.completedAt ? request.completedAt.toISOString() : null,
    notes: request.notes,
    mapX: null,
    mapY: null
  }));

  return {
    activeTrips,
    historyTrips,
    dashboardStats: {
      activeDeliveries: activeTrips.length,
      avgPickupTime: activeTrips.length ? '6 min' : '0 min',
      deliveredToday: historyTrips.filter((trip) => trip.status === 'delivered').length
    }
  };
}
