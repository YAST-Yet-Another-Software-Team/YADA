import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import {
	businessProfiles,
	courierProfiles,
	deliveryRequests,
	users
} from '$lib/server/db/schema';

/**
 * Development fixture: a business, a courier, and three trips around KNUST.
 *
 * The seeded users carry no credentials, so they cannot be signed in as — they
 * exist to give the dashboard and courier screens data to render. This is
 * deliberately not reachable over HTTP: the `/api/seed-test-user` endpoint
 * that used to call it wrote to the database with no authentication, which is
 * a bypass whatever environment check sits in front of it. To seed a dev
 * database, call this from a one-off server-side script instead.
 */
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
			orderName: 'Jollof and chicken × 2',
			orderPrice: '90.00',
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
			orderName: 'Pancakes × 4',
			orderPrice: '55.00',
			notes: 'Call on arrival',
			requestedAt: new Date(Date.now() - 1000 * 60 * 35),
			// Taken 3 minutes after it was raised; still running, so no completion
			// and so no recorded ride time yet.
			acceptedAt: new Date(Date.now() - 1000 * 60 * 32),
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
			orderName: 'Waakye bowl',
			orderPrice: '35.00',
			notes: 'Delivered to front desk',
			requestedAt: new Date(Date.now() - 1000 * 60 * 92),
			// Deliberately not `estimatedDurationMinutes` (5 min) — this ride took
			// 14, which is the point of recording it rather than the estimate.
			acceptedAt: new Date(Date.now() - 1000 * 60 * 26),
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
				orderName: trip.orderName,
				orderPrice: trip.orderPrice,
				notes: trip.notes,
				requestedAt: trip.requestedAt,
				acceptedAt: trip.acceptedAt ?? null,
				completedAt: trip.completedAt ?? null
			})
			.onConflictDoNothing();
	}

	return businessUser;
}
