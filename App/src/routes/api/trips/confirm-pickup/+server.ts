import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError, apiRoute, invalidTripId, readTripId } from '$lib/server/api-guard';
import { courierWithinRange } from '$lib/server/data/courier-location';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { applyTripChange, tripMoved } from '$lib/server/data/trip-transition';
import { PICKUP_PROXIMITY_KM } from '$lib/shared/geo/proximity';
import { isPickupPhase } from '$lib/shared/trip-status';

/**
 * End the pickup phase: the business says the parcel is now with the courier.
 *
 * The business drives this rather than the courier because they are the one
 * handing the parcel over — a courier who could mark their own pickup could
 * mark it from the road. The rider still has to be at the counter for it to be
 * accepted, checked against their last reported position.
 */
export const POST: RequestHandler = apiRoute({ role: 'business' }, async ({ request }, user) => {
	const tripId = await readTripId(request);
	if (!tripId) return invalidTripId();

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

	// The courier is pinned as well as the status: the proximity check above is a
	// round trip, and a rider who releases the trip during it would otherwise
	// have a handover written against a delivery they are no longer on.
	const confirmed = await applyTripChange(
		tripId,
		[
			eq(deliveryRequests.businessId, user.id),
			eq(deliveryRequests.assignedCourierId, trip.assignedCourierId),
			eq(deliveryRequests.status, trip.status)
		],
		{ status: 'picked_up' }
	);

	if (!confirmed) return tripMoved();

	await recordStatusChange(tripId, user.id, {
		from: trip.status,
		to: 'picked_up',
		action: 'confirm_pickup'
	});

	return json({ ok: true, tripId, status: 'picked_up' });
});
