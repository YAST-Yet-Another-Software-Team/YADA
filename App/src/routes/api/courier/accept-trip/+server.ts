import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, isNull } from 'drizzle-orm';

import { apiError, emailUnverified } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests, tripDeclines } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import { isUuid } from '$lib/shared/uuid';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'courier') return apiError(403, 'denied', 'Courier account required.');
	// Belt and braces behind the availability gate: this endpoint is reachable
	// on its own and never re-reads the online flag, so an unverified courier
	// who was rung by a stale screen could otherwise still take the job.
	if (!user.emailVerified) return emailUnverified('accepting a delivery');

	const body = await request.json();
	const tripId = body?.tripId;
	if (!isUuid(tripId)) {
		return apiError(400, 'invalid_request', 'Trip id required.');
	}

	// "No" is final for this request: a courier who declined isn't ringed on a
	// re-ring, and can't quietly take the job back through a stale screen either.
	const [declined] = await db
		.select({ id: tripDeclines.id })
		.from(tripDeclines)
		.where(and(eq(tripDeclines.tripId, tripId), eq(tripDeclines.courierId, user.id)))
		.limit(1);

	if (declined) {
		return apiError(409, 'conflict', 'You declined this delivery.');
	}

	// Deliberately no ring/timeout check here: the board only *shows* what's
	// ringing, but a just-in-time accept at second 61 still beats telling the
	// business nobody came. Claiming is scoped to trips that are still
	// unclaimed, so two couriers racing on the same offer can't both succeed.
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
