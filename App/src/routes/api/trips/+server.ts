import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';

import { apiError, apiRoute, readJsonBody } from '$lib/server/api-guard';
import { getBusinessAddress, getCourierSummary } from '$lib/server/data/business';
import { getCourierFix } from '$lib/server/data/courier-location';
import { ratingByRaterForTrip } from '$lib/server/data/ratings';
import { db } from '$lib/server/db';
import { toCoordinateColumn } from '$lib/server/db/columns';
import { deliveryRequests, tripEvents } from '$lib/server/db/schema';
import { containsPoint } from '$lib/shared/geo/service-area';
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
	orderName?: string;
	orderPrice?: number | string;
	notes?: string;
	estimatedDistanceKm?: number;
	estimatedDurationMinutes?: number;
};

/** Long enough for "2× large pancakes + syrup", short enough to read on a row. */
const MAX_ORDER_NAME = 120;

/**
 * The ceiling on a single order's declared value, in cedis.
 *
 * Not a business rule about what YADA will carry — it is the guard that keeps a
 * fat-fingered amount out of a `numeric(10, 2)` column, which tops out at eight
 * digits before the point.
 */
const MAX_ORDER_PRICE = 1_000_000;

/**
 * The order's value, as the column stores it.
 *
 * Accepts a number or the string a form sends, and refuses anything that isn't
 * a finite, non-negative amount. Rounded to the two decimal places the column
 * keeps, here rather than in the database, so what is stored is what the API
 * agreed to rather than a silent truncation.
 */
function toPriceColumn(value: unknown) {
	const amount = typeof value === 'string' ? Number(value.trim()) : Number(value);

	if (!Number.isFinite(amount) || amount < 0 || amount > MAX_ORDER_PRICE) return null;

	return amount.toFixed(2);
}

export const POST: RequestHandler = apiRoute(
	{ role: 'business', verifiedFor: 'sending a delivery' },
	async ({ request }, user) => {
		try {
			const business = await getBusinessAddress(user.id);
			if (!business) {
				return apiError(
					409,
					'no_business_address',
					'Set your business address before requesting a delivery.'
				);
			}

			const body = (await readJsonBody<CreateTripBody>(request)) ?? {};
			const dropoffAddress = body.dropoffAddress?.trim();
			const dropoffLat = Number(body.dropoffLat);
			const dropoffLng = Number(body.dropoffLng);

			if (!dropoffAddress || !Number.isFinite(dropoffLat) || !Number.isFinite(dropoffLng)) {
				return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
			}

			// The order record. Checked here and not only on the form, because the
			// columns are NOT NULL and a request without them is one nobody can audit
			// afterwards — which is the whole reason they exist.
			const orderName = body.orderName?.trim();
			if (!orderName) {
				return apiError(400, 'invalid_request', 'Say what is being sent.');
			}

			if (orderName.length > MAX_ORDER_NAME) {
				return apiError(400, 'invalid_request', 'That order name is too long.');
			}

			const orderPrice = toPriceColumn(body.orderPrice);
			if (orderPrice === null) {
				return apiError(400, 'invalid_request', 'Enter what the order is worth, in cedis.');
			}

			// Neither end is zone-checked. A delivery that starts or finishes outside
			// KNUST/Ayeduase is still a delivery someone wants; whether a courier
			// takes it is the courier's call, which is what the offer ring is for.

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
					orderName,
					orderPrice,
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
	}
);
