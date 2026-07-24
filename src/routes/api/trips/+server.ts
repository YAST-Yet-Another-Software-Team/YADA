import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { deliveryRequests, tripEvents } from '$lib/server/schema';
import { assertInZone, containsPoint } from '$lib/geo/service-area';
import { GeoError, geoErrorMessage } from '$lib/geo/errors';
import { appEnv } from '$lib/server/env';

type CreateTripBody = {
	pickupAddress?: string;
	dropoffAddress?: string;
	pickupLat?: number;
	pickupLng?: number;
	dropoffLat?: number;
	dropoffLng?: number;
	pickupPlaceId?: string;
	dropoffPlaceId?: string;
	notes?: string;
	estimatedDistanceKm?: number;
	estimatedDurationMinutes?: number;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ ok: false, code: 'denied', message: 'Sign in required.' }, { status: 401 });
	}
	if (locals.user.role !== 'business' && locals.user.role !== 'admin') {
		return json({ ok: false, code: 'denied', message: 'Business account required.' }, { status: 403 });
	}
	if (!db) {
		return json({ ok: false, code: 'unavailable', message: 'Database unavailable.' }, { status: 503 });
	}

	try {
		const body = (await request.json()) as CreateTripBody;
		const pickupAddress = body.pickupAddress?.trim();
		const dropoffAddress = body.dropoffAddress?.trim();
		const pickupLat = Number(body.pickupLat);
		const pickupLng = Number(body.pickupLng);
		const dropoffLat = Number(body.dropoffLat);
		const dropoffLng = Number(body.dropoffLng);

		if (
			!pickupAddress ||
			!dropoffAddress ||
			!Number.isFinite(pickupLat) ||
			!Number.isFinite(pickupLng) ||
			!Number.isFinite(dropoffLat) ||
			!Number.isFinite(dropoffLng)
		) {
			return json(
				{ ok: false, code: 'invalid_request', message: geoErrorMessage('invalid_request') },
				{ status: 400 }
			);
		}

		assertInZone({ lat: pickupLat, lng: pickupLng });
		assertInZone({ lat: dropoffLat, lng: dropoffLng });

		const [trip] = await db
			.insert(deliveryRequests)
			.values({
				businessId: locals.user.id,
				status: 'requested',
				pickupAddress,
				dropoffAddress,
				pickupLatitude: pickupLat.toFixed(6),
				pickupLongitude: pickupLng.toFixed(6),
				dropoffLatitude: dropoffLat.toFixed(6),
				dropoffLongitude: dropoffLng.toFixed(6),
				pickupPlaceId: body.pickupPlaceId ?? null,
				dropoffPlaceId: body.dropoffPlaceId ?? null,
				notes: body.notes ?? null,
				estimatedDistanceKm:
					body.estimatedDistanceKm != null ? String(body.estimatedDistanceKm) : null,
				estimatedDurationMinutes:
					body.estimatedDurationMinutes != null
						? String(body.estimatedDurationMinutes)
						: null
			})
			.returning();

		await db.insert(tripEvents).values({
			tripId: trip.id,
			actorId: locals.user.id,
			eventType: 'trip_created',
			payload: JSON.stringify({
				pickup: { lat: pickupLat, lng: pickupLng },
				dropoff: { lat: dropoffLat, lng: dropoffLng },
				mapsKeyConfigured: Boolean(appEnv.googleMapsApiKey)
			})
		});

		return json({
			ok: true,
			trip: {
				id: trip.id,
				status: trip.status,
				pickupAddress: trip.pickupAddress,
				dropoffAddress: trip.dropoffAddress,
				pickupLat,
				pickupLng,
				dropoffLat,
				dropoffLng,
				estimatedDistanceKm: body.estimatedDistanceKm ?? null,
				estimatedDurationMinutes: body.estimatedDurationMinutes ?? null
			}
		});
	} catch (error) {
		if (error instanceof GeoError) {
			return json({ ok: false, code: error.code, message: error.message }, { status: 422 });
		}
		console.error('create trip failed', error);
		return json(
			{ ok: false, code: 'unavailable', message: geoErrorMessage('unavailable') },
			{ status: 502 }
		);
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ ok: false, code: 'denied', message: 'Sign in required.' }, { status: 401 });
	}
	if (!db) {
		return json({ ok: false, code: 'unavailable', message: 'Database unavailable.' }, { status: 503 });
	}

	const tripId = url.searchParams.get('id');
	if (!tripId) {
		return json(
			{ ok: false, code: 'invalid_request', message: geoErrorMessage('invalid_request') },
			{ status: 400 }
		);
	}

	const [trip] = await db.select().from(deliveryRequests).where(eq(deliveryRequests.id, tripId)).limit(1);
	if (!trip) {
		return json({ ok: false, code: 'no_results', message: 'Trip not found.' }, { status: 404 });
	}

	const pickupLat = trip.pickupLatitude != null ? Number(trip.pickupLatitude) : null;
	const pickupLng = trip.pickupLongitude != null ? Number(trip.pickupLongitude) : null;
	const dropoffLat = trip.dropoffLatitude != null ? Number(trip.dropoffLatitude) : null;
	const dropoffLng = trip.dropoffLongitude != null ? Number(trip.dropoffLongitude) : null;

	return json({
		ok: true,
		trip: {
			id: trip.id,
			status: trip.status,
			businessId: trip.businessId,
			assignedCourierId: trip.assignedCourierId,
			pickupAddress: trip.pickupAddress,
			dropoffAddress: trip.dropoffAddress,
			pickupLat,
			pickupLng,
			dropoffLat,
			dropoffLng,
			estimatedDistanceKm:
				trip.estimatedDistanceKm != null ? Number(trip.estimatedDistanceKm) : null,
			estimatedDurationMinutes:
				trip.estimatedDurationMinutes != null
					? Number(trip.estimatedDurationMinutes)
					: null,
			pickupInZone:
				pickupLat != null && pickupLng != null
					? containsPoint({ lat: pickupLat, lng: pickupLng })
					: false,
			dropoffInZone:
				dropoffLat != null && dropoffLng != null
					? containsPoint({ lat: dropoffLat, lng: dropoffLng })
					: false
		}
	});
};
