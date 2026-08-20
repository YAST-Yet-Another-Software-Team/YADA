import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError, apiRoute, invalidTripId, readTripId } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests, tripDeclines } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { applyTripChange, tripMoved } from '$lib/server/data/trip-transition';
import { isReleasableByCourier } from '$lib/shared/trip-status';

/**
 * A courier lets go of a job they had accepted, before reaching the pickup.
 *
 * Deliberately not a cancellation of the delivery. The business still wants
 * their parcel moved — they didn't change their mind, a rider did — so the
 * request goes back out to everyone else rather than dying with the one person
 * who dropped it. What changes is only this courier's relationship to it:
 *
 *   - the trip returns to `requested` and loses its assignment;
 *   - the dispatch clock restarts, so the ring begins again from the tightest
 *     radius rather than resuming wherever the original search had spread to;
 *   - a decline is written, so the ring never offers it back to the rider who
 *     just let it go.
 *
 * `accepted_at` is deliberately left in place. It is what tells the business's
 * tracking screen that this search follows a rider dropping out rather than
 * being the original one — see `releasedByCourier` in `GET /api/trips` — and
 * the next acceptance overwrites it.
 *
 * The window closes on arrival: from `courier_arriving` the rider is at the
 * counter, and walking away from that is not something to do through an API.
 */
export const POST: RequestHandler = apiRoute({ role: 'courier' }, async ({ request }, user) => {
	const tripId = await readTripId(request);
	if (!tripId) return invalidTripId();

	// Scoped to the courier's own trip, so the assignment check and the lookup
	// are the same query.
	const [trip] = await db
		.select({ status: deliveryRequests.status })
		.from(deliveryRequests)
		.where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.assignedCourierId, user.id)))
		.limit(1);

	if (!trip) {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	if (!isReleasableByCourier(trip.status)) {
		return apiError(
			409,
			'conflict',
			trip.status === 'cancelled'
				? 'This delivery was already cancelled.'
				: 'You have already reached the pickup — talk to the business instead.'
		);
	}

	const released = await applyTripChange(
		tripId,
		[
			eq(deliveryRequests.assignedCourierId, user.id),
			eq(deliveryRequests.status, trip.status)
		],
		{ status: 'requested', assignedCourierId: null, dispatchStartedAt: new Date() }
	);

	if (!released) return tripMoved();

	// "No" with a memory, the same row `POST /api/courier/decline-trip` writes.
	// Dropping a job you accepted says at least as much as declining the offer.
	// Written only once the release actually landed: a decline recorded against
	// a trip this courier still holds would unring them from their own delivery.
	await db.insert(tripDeclines).values({ tripId, courierId: user.id }).onConflictDoNothing();

	await recordStatusChange(tripId, user.id, {
		from: trip.status,
		to: 'requested',
		action: 'courier_released'
	});

	return json({ ok: true, tripId, status: 'requested' });
});
