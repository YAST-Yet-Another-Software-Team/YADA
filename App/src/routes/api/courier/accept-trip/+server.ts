import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, isNull } from 'drizzle-orm';

import { apiError, requireApiUser } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { isUuid } from '$lib/shared/uuid';

export const POST: RequestHandler = async ({ request, locals }) => {
	const guard = requireApiUser(locals, 'courier');
	if (guard.error) return guard.error;
	const { user } = guard;

	const body = await request.json();
	const tripId = body?.tripId;
	if (!isUuid(tripId)) {
		return apiError(400, 'invalid_request', 'Trip id required.');
	}

	// Claiming is scoped to trips that are still unclaimed, so two couriers
	// racing on the same offer can't both come back with a success.
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
		.set({ assignedCourierId: user.id, status: 'accepted', acceptedAt: new Date() })
		.where(eq(deliveryRequests.id, tripId));

	await recordStatusChange(tripId, user.id, { from: 'requested', to: 'accepted' });

	return json({ ok: true, tripId });
};
