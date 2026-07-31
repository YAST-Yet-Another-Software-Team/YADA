import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, isNull } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { isUuid } from '$lib/shared/uuid';

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

	await db
		.update(deliveryRequests)
		.set({ status: 'cancelled' })
		.where(eq(deliveryRequests.id, tripId));

	await recordStatusChange(tripId, user.id, {
		from: 'requested',
		to: 'cancelled',
		action: 'decline'
	});

	return json({ ok: true, tripId, status: 'cancelled' });
};
