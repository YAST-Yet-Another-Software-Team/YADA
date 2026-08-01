import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

import { apiError } from '$lib/server/api-guard';
import { getBusinessAddress, getCourierSummary } from '$lib/server/data/business';
import { getCourierFix } from '$lib/server/data/courier-location';
import { db } from '$lib/server/db';
import { deliveryRequests, tripEvents } from '$lib/server/db/schema';
import { assertInZone, containsPoint } from '$lib/shared/geo/service-area';
import { GeoError, geoErrorMessage } from '$lib/shared/geo/errors';
import { isUuid } from '$lib/shared/uuid';
import { env } from '$env/dynamic/private';

/**
 * Only the destination comes off the wire. Pickup is the business's stored
 * address, read here rather than accepted from the client: the business doesn't
 * move, so letting a request nominate its own origin would only ever be a way to
 * disagree with the profile.
 */
type CreateTripBody = {
	dropoffAddress?: string;
	dropoffLat?: number;
	dropoffLng?: number;
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
		const business = await getBusinessAddress(user.id);
		if (!business) {
			return apiError(
				409,
				'no_business_address',
				'Set your business address before requesting a delivery.'
			);
		}

		const body = (await request.json()) as CreateTripBody;
		const dropoffAddress = body.dropoffAddress?.trim();
		const dropoffLat = Number(body.dropoffLat);
		const dropoffLng = Number(body.dropoffLng);

		if (!dropoffAddress || !Number.isFinite(dropoffLat) || !Number.isFinite(dropoffLng)) {
			return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
		}

		assertInZone({ lat: business.lat, lng: business.lng });
		assertInZone({ lat: dropoffLat, lng: dropoffLng });

		const [trip] = await db
			.insert(deliveryRequests)
			.values({
				businessId: user.id,
				status: 'requested',
				pickupAddress: business.address,
				dropoffAddress,
				pickupLatitude: toCoordinateColumn(business.lat),
				pickupLongitude: toCoordinateColumn(business.lng),
				dropoffLatitude: toCoordinateColumn(dropoffLat),
				dropoffLongitude: toCoordinateColumn(dropoffLng),
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
				pickup: { lat: business.lat, lng: business.lng },
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
				pickupLat: business.lat,
				pickupLng: business.lng,
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

	// Whoever is carrying the parcel, named from the account rather than left to
	// the tracking screen to invent. Absent until someone accepts.
	//
	// Their last stored position rides along so the tracking map can focus on the
	// rider the moment a match happens. Live updates arrive over the socket, but
	// the first one is however long the courier's next fix is away — without this
	// a freshly matched business watches an empty map until then.
	const courier = trip.assignedCourierId
		? await getCourierSummary(trip.assignedCourierId)
		: null;
	const courierFix = trip.assignedCourierId ? await getCourierFix(trip.assignedCourierId) : null;

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
			courier,
			courierLocation: courierFix
				? {
						lat: courierFix.point.lat,
						lng: courierFix.point.lng,
						recordedAt: courierFix.recordedAt.toISOString()
					}
				: null,
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
