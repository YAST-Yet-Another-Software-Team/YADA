import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, inArray } from 'drizzle-orm';

import { apiError, requireApiUser } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { courierProfiles, deliveryRequests } from '$lib/server/db/schema';
import { recordTripEvent } from '$lib/server/data/trip-events';
import { geoErrorMessage } from '$lib/shared/geo/errors';
import { getIo } from '$lib/server/realtime/instance';
import { ACTIVE_TRIP_STATUSES } from '$lib/shared/trip-status';
import { isUuid } from '$lib/shared/uuid';

type LocationBody = {
	lat?: number;
	lng?: number;
	heading?: number;
	tripId?: string;
	recordedAt?: string;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const guard = requireApiUser(locals, 'courier');
	if (guard.error) return guard.error;
	const { user } = guard;

	const body = (await request.json()) as LocationBody;
	const lat = Number(body.lat);
	const lng = Number(body.lng);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
	}

	const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();

	await db
		.update(courierProfiles)
		.set({
			currentLatitude: lat.toFixed(6),
			currentLongitude: lng.toFixed(6),
			lastLocationAt: recordedAt,
			updatedAt: new Date()
		})
		.where(eq(courierProfiles.userId, user.id));

	// A tripId is only honoured if it's this courier's own live trip; anything
	// else is dropped so a stale id can't attach fixes to someone's delivery.
	// Screening the shape first keeps a malformed id out of the uuid column,
	// where Postgres would raise rather than simply not match.
	let tripId = isUuid(body.tripId) ? body.tripId : null;
	if (tripId) {
		const [trip] = await db
			.select({ id: deliveryRequests.id })
			.from(deliveryRequests)
			.where(
				and(
					eq(deliveryRequests.id, tripId),
					eq(deliveryRequests.assignedCourierId, user.id),
					inArray(deliveryRequests.status, [...ACTIVE_TRIP_STATUSES])
				)
			)
			.limit(1);

		if (!trip) {
			tripId = null;
		} else {
			await recordTripEvent(trip.id, user.id, 'rider_location', {
				lat,
				lng,
				heading: body.heading ?? null,
				recordedAt: recordedAt.toISOString()
			});
		}
	}

	const payload = {
		courierId: user.id,
		tripId,
		lat,
		lng,
		heading: body.heading ?? null,
		recordedAt: recordedAt.toISOString()
	};

	// Only the trip's own room; membership is verified per join against
	// GET /api/trips?id=, so a fix only reaches that delivery's participants.
	const io = getIo();
	if (io && tripId) {
		io.to(`trip:${tripId}`).emit('rider:location', payload);
	}

	return json({ ok: true, location: payload });
};
