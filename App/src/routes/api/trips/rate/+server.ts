import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { AlreadyRatedError, rateCourierForTrip } from '$lib/server/data/ratings';
import { recordTripEvent } from '$lib/server/data/trip-events';

/**
 * Whole stars, one to five, with an optional comment. `int()` because 4.5 from
 * a hand-written request would poison the average with a value the UI can
 * neither produce nor display.
 */
const bodySchema = z.object({
	tripId: z.uuid(),
	stars: z.number().int().min(1).max(5),
	comment: z
		.string()
		.trim()
		.max(500, 'Keep the comment under 500 characters.')
		.optional()
});

/**
 * The business rates the rider on a completed trip (SRS 2.2.1.5).
 *
 * Only the business, only their own trip, only once it is completed, and only
 * once — the last of those enforced by the table's unique constraint rather
 * than a read-then-write, so two racing submissions can't both land. The
 * courier's cached average updates in the same transaction; the matching
 * rubric reads that cache, which is how a rating becomes a ranking.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return apiError(400, 'invalid_request', parsed.error.issues[0].message);
	}

	const { tripId, stars, comment } = parsed.data;

	// Scoped to the caller's own trip, so ownership and lookup are one query.
	const [trip] = await db
		.select({
			status: deliveryRequests.status,
			assignedCourierId: deliveryRequests.assignedCourierId
		})
		.from(deliveryRequests)
		.where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.businessId, user.id)))
		.limit(1);

	if (!trip) {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	// A trip nobody carried has nobody to rate, and one still moving hasn't
	// earned a verdict yet. Cancelled trips are excluded on purpose: a rating is
	// about how a delivery went, and a cancelled trip is a delivery that didn't.
	if (trip.status !== 'completed' || !trip.assignedCourierId) {
		return apiError(409, 'conflict', 'Only completed deliveries can be rated.');
	}

	try {
		const { average, total } = await rateCourierForTrip({
			tripId,
			raterId: user.id,
			courierId: trip.assignedCourierId,
			stars,
			comment: comment || null
		});

		await recordTripEvent(tripId, user.id, 'courier_rated', { stars });

		return json({ ok: true, tripId, stars, courier: { rating: average, ratingCount: total } });
	} catch (error) {
		if (error instanceof AlreadyRatedError) {
			return apiError(409, 'conflict', error.message);
		}
		throw error;
	}
};
