import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests, tripEvents } from '$lib/server/db/schema';
import { assertInZone, containsPoint } from '$lib/shared/geo/service-area';
import { GeoError, geoErrorMessage } from '$lib/shared/geo/errors';
import { isUuid } from '$lib/shared/uuid';
import { env } from '$env/dynamic/private';

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

/** `numeric(10, 6)` columns — the scale the schema stores coordinates at. */
function toCoordinateColumn(value: number) {
	return value.toFixed(6);
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

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
			return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
		}

		assertInZone({ lat: pickupLat, lng: pickupLng });
		assertInZone({ lat: dropoffLat, lng: dropoffLng });

		const [trip] = await db
			.insert(deliveryRequests)
			.values({
				businessId: user.id,
				status: 'requested',
				pickupAddress,
				dropoffAddress,
				pickupLatitude: toCoordinateColumn(pickupLat),
				pickupLongitude: toCoordinateColumn(pickupLng),
				dropoffLatitude: toCoordinateColumn(dropoffLat),
				dropoffLongitude: toCoordinateColumn(dropoffLng),
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
			actorId: user.id,
			eventType: 'trip_created',
			payload: JSON.stringify({
				pickup: { lat: pickupLat, lng: pickupLng },
				dropoff: { lat: dropoffLat, lng: dropoffLng },
				mapsKeyConfigured: Boolean(env.GOOGLE_MAPS_API_KEY)
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
			return apiError(422, error.code, error.message);
		}
		console.error('create trip failed', error);
		return apiError(502, 'unavailable', geoErrorMessage('unavailable'));
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');

	const tripId = url.searchParams.get('id');
	if (!isUuid(tripId)) {
		return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
	}

	const [trip] = await db
		.select()
		.from(deliveryRequests)
		.where(eq(deliveryRequests.id, tripId))
		.limit(1);

	// Scope the trip to its participants — a valid session alone must not grant
	// read access to another business's delivery, addresses included. 404 rather
	// than 403, so a miss doesn't confirm the id exists.
	const isParticipant = trip?.businessId === user.id || trip?.assignedCourierId === user.id;
	if (!trip || !isParticipant) {
		return apiError(404, 'no_results', 'Trip not found.');
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
