import { desc, eq } from 'drizzle-orm';

import { toDispatchStage } from '$lib/shared/trip-status';
import type { DashboardTripRecord } from '$lib/utils/types';

import { db } from '../db';
import { businessProfiles, courierProfiles, deliveryRequests, users } from '../db/schema';


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
			estimatedDurationMinutes: deliveryRequests.estimatedDurationMinutes,
			notes: deliveryRequests.notes,
			requestedAt: deliveryRequests.requestedAt,
			acceptedAt: deliveryRequests.acceptedAt,
			completedAt: deliveryRequests.completedAt,
			businessName: users.name
		})
		.from(deliveryRequests)
		.innerJoin(users, eq(deliveryRequests.businessId, users.id))
		.where(eq(deliveryRequests.businessId, ownerId))
		.orderBy(desc(deliveryRequests.requestedAt));

	const businessProfileRow = (
		await db.select().from(businessProfiles).where(eq(businessProfiles.userId, ownerId)).limit(1)
	)[0];

	const mapped = records.map((record) => {
		const baseId = formatTripId(record.id);
		const status = toDispatchStage(record.status);
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

export async function seedTestBusinessUser() {
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