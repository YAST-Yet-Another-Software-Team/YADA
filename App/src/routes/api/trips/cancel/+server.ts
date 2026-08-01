import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { isUuid } from '$lib/shared/uuid';

/**
 * Withdraw a delivery request.
 *
 * Only while it is still `requested`. Once a courier has accepted, someone is
 * riding towards the pickup on the strength of it, and calling that off is a
 * different problem — one with a courier to notify and possibly a parcel already
 * collected — rather than a wider version of this button. The rule is enforced
 * here and not only in the UI, because the dashboard, the tracking screen and
 * anything later that wants a cancel button all reach this same endpoint.
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

	if (trip.status !== 'requested') {
		return apiError(
			409,
			'conflict',
			trip.status === 'cancelled'
				? 'This request was already cancelled.'
				: 'A rider has already accepted this request, so it can no longer be cancelled.'
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
