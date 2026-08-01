import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordTripEvent } from '$lib/server/data/trip-events';
import { DISPATCH_TIMEOUT_SECONDS } from '$lib/shared/dispatch';
import { isUuid } from '$lib/shared/uuid';

/**
 * Re-ring a request whose 60-second search found nobody.
 *
 * Manual by design — the spec's word is "remade" — and only after the timeout:
 * a reset mid-search would shrink the ring back to 400 m around riders who are
 * already being alerted. Nothing else changes: declines persist (the couriers
 * who said no stay unrung), the trip keeps its id, and the business keeps its
 * tracking page.
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
		.select({ status: deliveryRequests.status, dispatchStartedAt: deliveryRequests.dispatchStartedAt })
		.from(deliveryRequests)
		.where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.businessId, user.id)))
		.limit(1);

	if (!trip) {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	if (trip.status !== 'requested') {
		return apiError(409, 'conflict', 'This request is no longer searching for a rider.');
	}

	const elapsedSeconds = (Date.now() - trip.dispatchStartedAt.getTime()) / 1000;
	if (elapsedSeconds <= DISPATCH_TIMEOUT_SECONDS) {
		return apiError(409, 'conflict', 'Riders are still being alerted — give it a moment.');
	}

	await db
		.update(deliveryRequests)
		.set({ dispatchStartedAt: new Date() })
		.where(eq(deliveryRequests.id, tripId));

	await recordTripEvent(tripId, user.id, 'dispatch_retried', {});

	return json({ ok: true, tripId });
};
