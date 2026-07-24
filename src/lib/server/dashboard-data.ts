import { desc, eq } from 'drizzle-orm';

import { db } from './db';
import { businessProfiles, courierProfiles, deliveryRequests, users } from './schema';

export type DashboardTripRecord = {
	id: string;
	rawId: string;
	rider: string | null;
	destination: string;
	pickup: string | null;
	eta: string | null;
	status: 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';
	completedAt: string | null;
	notes: string | null;
	pickupLat?: number | null;
	pickupLng?: number | null;
	dropoffLat?: number | null;
	dropoffLng?: number | null;
	mapX?: number;
	mapY?: number;
};

export type DispatchRiderRecord = {
	id: string;
	userId: string;
	name: string;
	vehicle: string;
	distanceKm: number;
	lat: number;
	lng: number;
	lastLocationAt: string | null;
	stale: boolean;
	mapX: number;
	mapY: number;
};

const STALE_LOCATION_MS = 30_000;

function toDashboardStatus(status: string) {
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

function formatTripId(id: string) {
	return id.startsWith('YD-') ? id : `YD-${id.slice(0, 4).toUpperCase()}`;
}

function formatTime(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

export async function getDashboardTrips(ownerId?: string) {
	if (!db) return { activeTrips: [], historyTrips: [], businessProfile: null };

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
			estimatedDurationMinutes: deliveryRequests.estimatedDurationMinutes,
			notes: deliveryRequests.notes,
			requestedAt: deliveryRequests.requestedAt,
			acceptedAt: deliveryRequests.acceptedAt,
			completedAt: deliveryRequests.completedAt,
			businessName: users.name
		})
		.from(deliveryRequests)
		.innerJoin(users, eq(deliveryRequests.businessId, users.id))
		.orderBy(desc(deliveryRequests.requestedAt));

	const filtered = ownerId ? records.filter((record) => record.businessId === ownerId) : records;
	const businessProfileRow = ownerId
		? (await db.select().from(businessProfiles).where(eq(businessProfiles.userId, ownerId)).limit(1))[0]
		: null;

	const mapped = filtered.map((record) => {
		const baseId = formatTripId(record.id);
		const status = toDashboardStatus(record.status);
		const completedAt = record.completedAt ? formatTime(record.completedAt) : null;
		const duration = record.estimatedDurationMinutes
			? `${Math.round(Number(record.estimatedDurationMinutes))} min`
			: null;
		return {
			id: baseId,
			rawId: record.id,
			rider: record.assignedCourierId ? 'Courier' : null,
			destination: record.dropoffAddress,
			pickup: record.pickupAddress,
			eta: status === 'searching' || status === 'cancelled' ? null : duration,
			status,
			completedAt,
			notes: record.notes,
			pickupLat: record.pickupLatitude != null ? Number(record.pickupLatitude) : null,
			pickupLng: record.pickupLongitude != null ? Number(record.pickupLongitude) : null,
			dropoffLat: record.dropoffLatitude != null ? Number(record.dropoffLatitude) : null,
			dropoffLng: record.dropoffLongitude != null ? Number(record.dropoffLongitude) : null
		} satisfies DashboardTripRecord;
	});

	const activeTrips = mapped.filter((trip) => trip.status !== 'delivered' && trip.status !== 'cancelled');
	const historyTrips = mapped.filter((trip) => trip.status === 'delivered' || trip.status === 'cancelled');

	return {
		businessProfile: businessProfileRow
			? {
				name: businessProfileRow.businessName,
				businessName: businessProfileRow.businessName,
				email: null,
				phone: null,
				address: businessProfileRow.address,
				lat: Number(businessProfileRow.latitude),
				lng: Number(businessProfileRow.longitude)
			}
			: null,
		activeTrips,
		historyTrips
	};
}

export async function getAvailableRiders(ownerId?: string): Promise<DispatchRiderRecord[]> {
	if (!db) return [];

	const profile = ownerId
		? (await db.select().from(businessProfiles).where(eq(businessProfiles.userId, ownerId)).limit(1))[0]
		: null;

	const riders = await db
		.select({
			id: courierProfiles.id,
			userId: courierProfiles.userId,
			vehicleType: courierProfiles.vehicleType,
			currentLatitude: courierProfiles.currentLatitude,
			currentLongitude: courierProfiles.currentLongitude,
			lastLocationAt: courierProfiles.lastLocationAt,
			name: users.name
		})
		.from(courierProfiles)
		.innerJoin(users, eq(courierProfiles.userId, users.id))
		.where(eq(courierProfiles.active, true));

	const businessLatitude = profile ? Number(profile.latitude) : 6.6785;
	const businessLongitude = profile ? Number(profile.longitude) : -1.5645;

	return riders.map((rider, index) => {
		const riderLatitude = Number(rider.currentLatitude ?? businessLatitude + 0.004 * (index + 1));
		const riderLongitude = Number(rider.currentLongitude ?? businessLongitude + 0.003 * (index + 1));
		const distanceKm = Math.max(
			0.2,
			Math.round(Math.hypot(riderLatitude - businessLatitude, riderLongitude - businessLongitude) * 111 * 10) /
				10
		);
		const lastAt = rider.lastLocationAt ? new Date(rider.lastLocationAt).getTime() : 0;
		const stale = !lastAt || Date.now() - lastAt > STALE_LOCATION_MS;

		return {
			id: rider.id,
			userId: rider.userId,
			name: rider.name,
			vehicle: rider.vehicleType,
			distanceKm,
			lat: riderLatitude,
			lng: riderLongitude,
			lastLocationAt: rider.lastLocationAt ? new Date(rider.lastLocationAt).toISOString() : null,
			stale,
			mapX: 50,
			mapY: 50
		};
	});
}

export async function seedTestBusinessUser() {
	if (!db) {
		throw new Error('Database is not available.');
	}

	const existing = await db.select().from(users).where(eq(users.email, 'test-business@yada.local')).limit(1);
	const businessUser = existing[0] ?? (await db.insert(users).values({
		id: 'test-business-user',
		name: 'Test Business',
		email: 'test-business@yada.local',
		emailVerified: true,
		role: 'business'
	}).returning())[0];

	const existingBusinessProfile = await db
		.select()
		.from(businessProfiles)
		.where(eq(businessProfiles.userId, businessUser.id))
		.limit(1);

	if (!existingBusinessProfile[0]) {
		await db.insert(businessProfiles).values({
			userId: businessUser.id,
			businessName: 'Ayeduase Kitchen',
			address: 'Ayeduase Gate, near KNUST, Kumasi',
			latitude: '6.678500',
			longitude: '-1.564500'
		});
	} else {
		await db
			.update(businessProfiles)
			.set({
				businessName: 'Ayeduase Kitchen',
				address: 'Ayeduase Gate, near KNUST, Kumasi',
				latitude: '6.678500',
				longitude: '-1.564500',
				updatedAt: new Date()
			})
			.where(eq(businessProfiles.userId, businessUser.id));
	}

	const courierUser = (await db.select().from(users).where(eq(users.email, 'test-courier@yada.local')).limit(1))[0] ?? (await db.insert(users).values({
		id: 'test-courier-user',
		name: 'Test Courier',
		email: 'test-courier@yada.local',
		emailVerified: true,
		role: 'courier'
	}).returning())[0];

	const existingCourierProfile = await db
		.select()
		.from(courierProfiles)
		.where(eq(courierProfiles.userId, courierUser.id))
		.limit(1);

	if (!existingCourierProfile[0]) {
		await db.insert(courierProfiles).values({
			userId: courierUser.id,
			vehicleType: 'Motorbike',
			rating: '4.90',
			active: true,
			currentLatitude: '6.674500',
			currentLongitude: '-1.571600',
			lastLocationAt: new Date()
		});
	} else {
		await db
			.update(courierProfiles)
			.set({
				currentLatitude: '6.674500',
				currentLongitude: '-1.571600',
				lastLocationAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(courierProfiles.userId, courierUser.id));
	}

	const seedTrips = [
		{
			id: 'seed-trip-1',
			businessId: businessUser.id,
			status: 'requested',
			pickupAddress: 'Ayeduase Gate, near KNUST, Kumasi',
			dropoffAddress: 'KNUST Commercial Area, Kumasi',
			pickupLatitude: '6.678500',
			pickupLongitude: '-1.564500',
			dropoffLatitude: '6.674500',
			dropoffLongitude: '-1.571600',
			estimatedDistanceKm: '1.20',
			estimatedDurationMinutes: '6',
			notes: 'Leave at reception',
			requestedAt: new Date(Date.now() - 1000 * 60 * 18)
		},
		{
			id: 'seed-trip-2',
			businessId: businessUser.id,
			status: 'accepted',
			pickupAddress: 'Ayeduase Gate, near KNUST, Kumasi',
			dropoffAddress: 'Unity Hall, KNUST',
			pickupLatitude: '6.678500',
			pickupLongitude: '-1.564500',
			dropoffLatitude: '6.679800',
			dropoffLongitude: '-1.573200',
			estimatedDistanceKm: '1.80',
			estimatedDurationMinutes: '8',
			notes: 'Call on arrival',
			requestedAt: new Date(Date.now() - 1000 * 60 * 35),
			assignedCourierId: courierUser.id
		},
		{
			id: 'seed-trip-3',
			businessId: businessUser.id,
			status: 'completed',
			pickupAddress: 'Ayeduase Gate, near KNUST, Kumasi',
			dropoffAddress: 'Ayeduase New Site',
			pickupLatitude: '6.678500',
			pickupLongitude: '-1.564500',
			dropoffLatitude: '6.682000',
			dropoffLongitude: '-1.560000',
			estimatedDistanceKm: '0.90',
			estimatedDurationMinutes: '5',
			notes: 'Delivered to front desk',
			requestedAt: new Date(Date.now() - 1000 * 60 * 92),
			completedAt: new Date(Date.now() - 1000 * 60 * 12),
			assignedCourierId: courierUser.id
		}
	];

	for (const trip of seedTrips) {
		await db
			.insert(deliveryRequests)
			.values({
				businessId: trip.businessId,
				assignedCourierId: trip.assignedCourierId ?? null,
				status: trip.status as 'requested' | 'accepted' | 'completed',
				pickupAddress: trip.pickupAddress,
				dropoffAddress: trip.dropoffAddress,
				pickupLatitude: trip.pickupLatitude,
				pickupLongitude: trip.pickupLongitude,
				dropoffLatitude: trip.dropoffLatitude,
				dropoffLongitude: trip.dropoffLongitude,
				estimatedDistanceKm: trip.estimatedDistanceKm,
				estimatedDurationMinutes: trip.estimatedDurationMinutes,
				notes: trip.notes,
				requestedAt: trip.requestedAt,
				completedAt: trip.completedAt ?? null
			})
			.onConflictDoNothing();
	}

	return businessUser;
}