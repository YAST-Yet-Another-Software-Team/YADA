import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, isNull } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests, tripDeclines } from '$lib/server/db/schema';
import { recordTripEvent } from '$lib/server/data/trip-events';
import { isUuid } from '$lib/shared/uuid';

/**
 * A courier turns an offer down.
 *
 * This declines it *for that courier*: the request keeps ringing everyone
 * else, and the decline is remembered so a manual re-ring doesn't alert them
 * again. It used to set the whole trip to `cancelled` — one rider's "no"
 * killed the request for the business and every other courier, which is the
 * opposite of a cascade.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'courier') return apiError(403, 'denied', 'Courier account required.');

	const body = await request.json();
	const tripId = body?.tripId;
	if (!isUuid(tripId)) {
		return apiError(400, 'invalid_request', 'Trip id required.');
	}

	const [trip] = await db
		.select({ id: deliveryRequests.id })
		.from(deliveryRequests)
		.where(
			and(
				eq(deliveryRequests.id, tripId),
				eq(deliveryRequests.status, 'requested'),
				isNull(deliveryRequests.assignedCourierId)
			)
		)
		.limit(1);

	if (!trip) {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	// Declining twice is the same answer, not an error.
	await db
		.insert(tripDeclines)
		.values({ tripId, courierId: user.id })
		.onConflictDoNothing();

	await recordTripEvent(tripId, user.id, 'offer_declined', {});

	return json({ ok: true, tripId });
};
