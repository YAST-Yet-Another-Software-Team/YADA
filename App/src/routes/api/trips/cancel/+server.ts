import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { isCancellableByBusiness } from '$lib/shared/trip-status';
import { isUuid } from '$lib/shared/uuid';

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
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

	const body = await request.json().catch(() => null);
	const tripId = (body as { tripId?: unknown } | null)?.tripId;

	if (!isUuid(tripId)) {
		return apiError(400, 'invalid_request', 'Trip id required.');
	}

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

	await db
		.update(deliveryRequests)
		.set({ status: 'cancelled' })
		.where(eq(deliveryRequests.id, tripId));

	await recordStatusChange(tripId, user.id, {
		from: trip.status,
		to: 'cancelled',
		action: 'cancel'
	});

	return json({ ok: true, tripId, status: 'cancelled' });
};
