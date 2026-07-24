import { desc, eq } from 'drizzle-orm';

import { db } from './db';
import { businessProfiles, courierProfiles, deliveryRequests, users } from './schema';

export type DashboardTripRecord = {
	id: string;
	rider: string | null;
	destination: string;
	pickup: string | null;
	eta: string | null;
	status: 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';
	completedAt: string | null;
	notes: string | null;
	mapX?: number;
	mapY?: number;
};

export type DispatchRiderRecord = {
	id: string;
	name: string;
	vehicle: string;
	distanceKm: number;
	mapX: number;
	mapY: number;
};

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

function deriveMapCoordinate(seed: string, offset: number) {
	let hash = 0;
	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) % 9973;
	}
	return 20 + ((hash + offset) % 60);
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
		return {
			id: baseId,
			rider: record.assignedCourierId ? 'Courier' : null,
			destination: record.dropoffAddress,
			pickup: record.pickupAddress,
			eta: status === 'searching' || status === 'cancelled' ? null : '—',
			status,
			completedAt,
			notes: record.notes,
			mapX: deriveMapCoordinate(record.id, 8),
			mapY: deriveMapCoordinate(record.id, 19)
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
				mapX: deriveMapCoordinate(`${businessProfileRow.userId}:${businessProfileRow.businessName}`, 12),
				mapY: deriveMapCoordinate(`${businessProfileRow.address}:${businessProfileRow.userId}`, 27)
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
			name: users.name
		})
		.from(courierProfiles)
		.innerJoin(users, eq(courierProfiles.userId, users.id))
		.where(eq(courierProfiles.active, true));

	const businessLatitude = profile ? Number(profile.latitude) : 5.6037;
	const businessLongitude = profile ? Number(profile.longitude) : -0.187;

	return riders.map((rider, index) => {
		const riderLatitude = Number(rider.currentLatitude ?? businessLatitude + 0.01 * index);
		const riderLongitude = Number(rider.currentLongitude ?? businessLongitude + 0.01 * index);
		const distanceKm = Math.max(
			0.2,
			Math.round(Math.hypot(riderLatitude - businessLatitude, riderLongitude - businessLongitude) * 111 * 10) /
				10
		);

		return {
			id: rider.id,
			name: rider.name,
			vehicle: rider.vehicleType,
			distanceKm,
			mapX: deriveMapCoordinate(rider.id, 11 + index),
			mapY: deriveMapCoordinate(rider.userId, 23 + index)
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
			businessName: 'Test Business',
			address: '221 Baker St — Kitchen',
			latitude: '48.000000',
			longitude: '52.000000'
		});
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
			currentLatitude: '5.603700',
			currentLongitude: '-0.187000'
		});
	}

	const seedTrips = [
		{
			id: 'seed-trip-1',
			businessId: businessUser.id,
			status: 'requested',
			pickupAddress: '221 Baker St — Kitchen',
			dropoffAddress: '88 Elm St',
			notes: 'Leave at reception',
			requestedAt: new Date(Date.now() - 1000 * 60 * 18)
		},
		{
			id: 'seed-trip-2',
			businessId: businessUser.id,
			status: 'accepted',
			pickupAddress: '221 Baker St — Kitchen',
			dropoffAddress: '14 Pine Ct',
			notes: 'Call on arrival',
			requestedAt: new Date(Date.now() - 1000 * 60 * 35),
			assignedCourierId: courierUser.id
		},
		{
			id: 'seed-trip-3',
			businessId: businessUser.id,
			status: 'completed',
			pickupAddress: '221 Baker St — Kitchen',
			dropoffAddress: '12 River Rd',
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
				notes: trip.notes,
				requestedAt: trip.requestedAt,
				completedAt: trip.completedAt ?? null
			})
			.onConflictDoNothing();
	}

	return businessUser;
}