import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { courierWithinRange } from '$lib/server/data/courier-location';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { PICKUP_PROXIMITY_KM } from '$lib/shared/geo/proximity';
import { isPickupPhase } from '$lib/shared/trip-status';
import { isUuid } from '$lib/shared/uuid';

/**
 * End the pickup phase: the business says the parcel is now with the courier.
 *
 * The business drives this rather than the courier because they are the one
 * handing the parcel over — a courier who could mark their own pickup could
 * mark it from the road. The rider still has to be at the counter for it to be
 * accepted, checked against their last reported position.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

	const body = await request.json().catch(() => null);
	const tripId = (body as { tripId?: unknown } | null)?.tripId;

	if (!isUuid(tripId)) {
		return apiError(400, 'invalid_request', 'Trip id required.');
	}

	const [trip] = await db
		.select({
			status: deliveryRequests.status,
			assignedCourierId: deliveryRequests.assignedCourierId,
			pickupLatitude: deliveryRequests.pickupLatitude,
			pickupLongitude: deliveryRequests.pickupLongitude
		})
		.from(deliveryRequests)
		.where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.businessId, user.id)))
		.limit(1);

	if (!trip) {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	if (!trip.assignedCourierId || !isPickupPhase(trip.status)) {
		return apiError(
			409,
			'conflict',
			trip.status === 'requested'
				? 'No rider has accepted this request yet.'
				: 'This pickup has already been confirmed.'
		);
	}

	// A trip stored without pickup coordinates can't be checked against them.
	// Everything created since the business address became the origin has both.
	if (trip.pickupLatitude && trip.pickupLongitude) {
		const proximity = await courierWithinRange(
			trip.assignedCourierId,
			{ lat: Number(trip.pickupLatitude), lng: Number(trip.pickupLongitude) },
			PICKUP_PROXIMITY_KM,
			'pickup'
		);

		if (!proximity.ok) {
			return apiError(409, 'too_far', proximity.message);
		}
	}

	await db
		.update(deliveryRequests)
		.set({ status: 'picked_up' })
		.where(eq(deliveryRequests.id, tripId));

	await recordStatusChange(tripId, user.id, {
		from: trip.status,
		to: 'picked_up',
		action: 'confirm_pickup'
	});

	return json({ ok: true, tripId, status: 'picked_up' });
};
