import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { AlreadyRatedError, rateForTrip, type RatedRole } from '$lib/server/data/ratings';
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
 * Who `raterId` is entitled to rate on this trip.
 *
 * Derived from the trip rather than from the caller's account role, deliberately.
 * A role says what someone signed up as; the trip row says what they did on this
 * delivery, and only the second one grants the right to score it. Reading the
 * role instead would let a business rate a trip it happens to be the *courier*
 * on, which is not a case today but is one bad seed away from being one.
 *
 * Three outcomes, not two, because "you may not see this trip" and "there is
 * nobody on it to rate" are different answers and must not share a status code:
 * the first has to be indistinguishable from a nonexistent id, the second is
 * about the caller's own trip and should say what is actually wrong.
 */
type Counterpart =
	| { kind: 'ok'; ratedId: string; ratedRole: RatedRole }
	| { kind: 'not_participant' }
	| { kind: 'nobody_to_rate' };

function ratingCounterpart(
	trip: { businessId: string; assignedCourierId: string | null } | undefined,
	raterId: string
): Counterpart {
	if (!trip) return { kind: 'not_participant' };

	// A trip nobody carried has nobody for the business to rate. The reverse
	// cannot happen: an unassigned trip has no courier to be the caller.
	if (raterId === trip.businessId) {
		return trip.assignedCourierId
			? { kind: 'ok', ratedId: trip.assignedCourierId, ratedRole: 'courier' }
			: { kind: 'nobody_to_rate' };
	}

	if (raterId === trip.assignedCourierId) {
		return { kind: 'ok', ratedId: trip.businessId, ratedRole: 'business' };
	}

	return { kind: 'not_participant' };
}

/**
 * Either party rates the other on a completed trip (SRS 2.2.1.5, 3.4).
 *
 * One endpoint for both directions rather than two, because every rule is the
 * same on both sides — a participant, a completed trip, whole stars, once — and
 * the only thing that differs is who the counterpart is. Two endpoints would be
 * two copies of that list, and the copies would drift.
 *
 * Who may rate whom falls straight out of the trip row: the business rates the
 * rider who carried it, the rider rates the business they carried for, and
 * anyone who is neither gets the same 404 a nonexistent trip gets, so a stranger
 * probing ids cannot tell them apart.
 *
 * "Once" is enforced by the table's unique constraint rather than a
 * read-then-write, so two racing submissions can't both land. Note the
 * constraint is on (trip_id, rater_id), not on the trip — the two directions are
 * independent, and each side rating the same delivery is two rows, not a
 * conflict. The rated party's cached average updates in the same transaction.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return apiError(400, 'invalid_request', parsed.error.issues[0].message);
	}

	const { tripId, stars, comment } = parsed.data;

	const [trip] = await db
		.select({
			status: deliveryRequests.status,
			businessId: deliveryRequests.businessId,
			assignedCourierId: deliveryRequests.assignedCourierId
		})
		.from(deliveryRequests)
		.where(eq(deliveryRequests.id, tripId))
		.limit(1);

	// 404 rather than 403 for a non-participant, matching `GET /api/trips`: a
	// miss and a trip belonging to someone else must be indistinguishable.
	const counterpart = ratingCounterpart(trip, user.id);
	if (counterpart.kind === 'not_participant') {
		return apiError(404, 'no_results', 'Trip not found.');
	}

	// One still moving hasn't earned a verdict yet, and cancelled trips are
	// excluded on purpose: a rating is about how a delivery went, and a cancelled
	// trip is a delivery that didn't.
	if (trip.status !== 'completed') {
		return apiError(409, 'conflict', 'Only completed deliveries can be rated.');
	}

	if (counterpart.kind === 'nobody_to_rate') {
		return apiError(409, 'conflict', 'No rider carried this delivery.');
	}

	try {
		const { average, total } = await rateForTrip({
			tripId,
			raterId: user.id,
			ratedId: counterpart.ratedId,
			ratedRole: counterpart.ratedRole,
			stars,
			comment: comment || null
		});

		await recordTripEvent(
			tripId,
			user.id,
			counterpart.ratedRole === 'courier' ? 'courier_rated' : 'business_rated',
			{ stars }
		);

		return json({
			ok: true,
			tripId,
			stars,
			rated: { role: counterpart.ratedRole, rating: average, ratingCount: total }
		});
	} catch (error) {
		if (error instanceof AlreadyRatedError) {
			return apiError(409, 'conflict', error.message);
		}
		throw error;
	}
};
