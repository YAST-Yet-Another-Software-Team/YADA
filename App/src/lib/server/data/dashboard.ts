import { desc, eq } from 'drizzle-orm';

import { toDispatchStage } from '$lib/shared/trip-status';
import type { DashboardTripRecord } from '$lib/utils/types';

import { db } from '../db';
import { businessProfiles, deliveryRequests, users } from '../db/schema';


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
