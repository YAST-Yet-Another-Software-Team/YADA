import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError, apiRoute, invalidTripId, readTripId } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordTripEvent } from '$lib/server/data/trip-events';
import { applyTripChange, tripMoved } from '$lib/server/data/trip-transition';
import { DISPATCH_TIMEOUT_SECONDS } from '$lib/shared/dispatch';

const STILL_ALERTING = 'Riders are still being alerted — give it a moment.';

/**
 * Re-ring a request whose 60-second search found nobody.
 *
 * Manual by design — the spec's word is "remade" — and only after the timeout:
 * a reset mid-search would shrink the ring back to 400 m around riders who are
 * already being alerted. Nothing else changes: declines persist (the couriers
 * who said no stay unrung), the trip keeps its id, and the business keeps its
 * tracking page.
 */
export const POST: RequestHandler = apiRoute({ role: 'business' }, async ({ request }, user) => {
	const tripId = await readTripId(request);
	if (!tripId) return invalidTripId();

	const [trip] = await db
		.select({
			status: deliveryRequests.status,
			dispatchStartedAt: deliveryRequests.dispatchStartedAt
		})
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
		return apiError(409, 'conflict', STILL_ALERTING);
	}

	// Matching on the clock this request read, not just the id: two taps on
	// "Try again" would otherwise both restart the search, and the second would
	// shrink the ring back to 400 m around riders the first had already begun
	// alerting — the exact thing the timeout check above exists to prevent.
	const restarted = await applyTripChange(
		tripId,
		[
			eq(deliveryRequests.businessId, user.id),
			eq(deliveryRequests.status, 'requested'),
			eq(deliveryRequests.dispatchStartedAt, trip.dispatchStartedAt)
		],
		{ dispatchStartedAt: new Date() }
	);

	if (!restarted) return tripMoved(STILL_ALERTING);

	await recordTripEvent(tripId, user.id, 'dispatch_retried', {});

	return json({ ok: true, tripId });
});
