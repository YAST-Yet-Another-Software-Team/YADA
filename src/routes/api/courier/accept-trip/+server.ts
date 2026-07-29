import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { deliveryRequests, tripEvents } from '$lib/server/schema';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ ok: false, message: 'Sign in required.' }, { status: 401 });
	}
	if (locals.user.role !== 'courier' && locals.user.role !== 'admin') {
		return json({ ok: false, message: 'Courier account required.' }, { status: 403 });
	}
	if (!db) {
		return json({ ok: false, message: 'Database unavailable.' }, { status: 503 });
	}

	const body = await request.json();
	const tripId = typeof body?.tripId === 'string' ? body.tripId : null;
	if (!tripId) {
		return json({ ok: false, message: 'Trip id required.' }, { status: 400 });
	}

	const [trip] = await db
		.select({ id: deliveryRequests.id, status: deliveryRequests.status, assignedCourierId: deliveryRequests.assignedCourierId })
		.from(deliveryRequests)
		.where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.status, 'requested'), isNull(deliveryRequests.assignedCourierId)))
		.limit(1);

	if (!trip) {
		return json({ ok: false, message: 'Trip not found.' }, { status: 404 });
	}
	if (trip.status !== 'requested') {
		return json({ ok: false, message: 'Trip is no longer available.' }, { status: 409 });
	}

	await db
		.update(deliveryRequests)
		.set({ assignedCourierId: locals.user.id, status: 'accepted', acceptedAt: new Date() })
		.where(eq(deliveryRequests.id, tripId));

	await db.insert(tripEvents).values({
		tripId,
		actorId: locals.user.id,
		eventType: 'status_change',
		payload: JSON.stringify({ from: 'requested', to: 'accepted' })
	});

	return json({ ok: true, tripId });
};
