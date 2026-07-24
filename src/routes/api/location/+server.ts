import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { courierProfiles, deliveryRequests, tripEvents } from '$lib/server/schema';
import { geoErrorMessage } from '$lib/geo/errors';
import { getIo } from '$lib/server/socket-instance';

type LocationBody = {
	lat?: number;
	lng?: number;
	heading?: number;
	tripId?: string;
	recordedAt?: string;
};

const ACTIVE_STATUSES = [
	'accepted',
	'courier_arriving',
	'arrived',
	'in_progress'
] as const;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ ok: false, code: 'denied', message: 'Sign in required.' }, { status: 401 });
	}
	if (locals.user.role !== 'courier' && locals.user.role !== 'admin') {
		return json({ ok: false, code: 'denied', message: 'Courier account required.' }, { status: 403 });
	}
	if (!db) {
		return json({ ok: false, code: 'unavailable', message: 'Database unavailable.' }, { status: 503 });
	}

	const body = (await request.json()) as LocationBody;
	const lat = Number(body.lat);
	const lng = Number(body.lng);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return json(
			{ ok: false, code: 'invalid_request', message: geoErrorMessage('invalid_request') },
			{ status: 400 }
		);
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
		.where(eq(courierProfiles.userId, locals.user.id));

	let tripId = body.tripId ?? null;
	if (tripId) {
		const [trip] = await db
			.select()
			.from(deliveryRequests)
			.where(
				and(
					eq(deliveryRequests.id, tripId),
					eq(deliveryRequests.assignedCourierId, locals.user.id),
					inArray(deliveryRequests.status, [...ACTIVE_STATUSES])
				)
			)
			.limit(1);

		if (!trip) {
			tripId = null;
		} else {
			await db.insert(tripEvents).values({
				tripId: trip.id,
				actorId: locals.user.id,
				eventType: 'rider_location',
				payload: JSON.stringify({
					lat,
					lng,
					heading: body.heading ?? null,
					recordedAt: recordedAt.toISOString()
				})
			});
		}
	}

	const payload = {
		courierId: locals.user.id,
		tripId,
		lat,
		lng,
		heading: body.heading ?? null,
		recordedAt: recordedAt.toISOString()
	};

	const io = getIo();
	if (io) {
		if (tripId) {
			io.to(`trip:${tripId}`).emit('rider:location', payload);
		}
		io.to('dispatch:riders').emit('rider:location', payload);
	}

	return json({ ok: true, location: payload });
};
