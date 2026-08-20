import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError, apiRoute, invalidTripId, readTripId } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { applyTripChange, tripMoved } from '$lib/server/data/trip-transition';
import { isCancellableByBusiness } from '$lib/shared/trip-status';

/**
 * Withdraw a delivery request.
 *
 * The window closes when the rider reaches the counter, not when they accept.
 * Until then a business that changes its mind — the customer rang back, the
 * kitchen ran out — is calling off a journey, and the rider learns of it the
 * next time their screen refreshes. From `courier_arriving` on, someone is
 * standing at the shop for this, and the way out of that is a conversation, not
 * a button.
 *
 * The rule is enforced here and not only in the UI, because the dashboard, the
 * tracking screen and anything later that wants a cancel button all reach this
 * same endpoint.
 */
export const POST: RequestHandler = apiRoute({ role: 'business' }, async ({ request }, user) => {
	const tripId = await readTripId(request);
	if (!tripId) return invalidTripId();

	// Scoped to the caller's own trip, so ownership and lookup are one query.
	const [trip] = await db
		.select({ status: deliveryRequests.status })
		.from(deliveryRequests)
		.where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.businessId, user.id)))
		.limit(1);

	if (!trip) {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	if (!isCancellableByBusiness(trip.status)) {
		return apiError(
			409,
			'conflict',
			trip.status === 'cancelled'
				? 'This request was already cancelled.'
				: trip.status === 'completed'
					? 'This delivery is already finished.'
					: 'The rider has reached your counter — speak to them rather than cancelling here.'
		);
	}

	// A courier accepting, or reaching the counter, in the same instant must not
	// be overwritten by a cancellation whose window had already closed by the
	// time it was written.
	const cancelled = await applyTripChange(
		tripId,
		[eq(deliveryRequests.businessId, user.id), eq(deliveryRequests.status, trip.status)],
		{ status: 'cancelled' }
	);

	if (!cancelled) return tripMoved();

	await recordStatusChange(tripId, user.id, {
		from: trip.status,
		to: 'cancelled',
		action: 'cancel'
	});

	return json({ ok: true, tripId, status: 'cancelled' });
});
