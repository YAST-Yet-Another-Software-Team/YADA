import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { appEnv } from '$lib/server/env';
import { GeoError, geoErrorMessage, mapGoogleStatusToGeoError } from '$lib/geo/errors';
import {
	forwardCacheKey,
	serverGeocodeCache,
	type CachedGeocode
} from '$lib/geo/geocode-cache';
import { assertInZone, containsPoint } from '$lib/geo/service-area';

type ForwardBody = {
	address?: string;
	enforceZone?: boolean;
};

async function geocodeForward(address: string): Promise<CachedGeocode> {
	const key = forwardCacheKey(address);
	const cached = serverGeocodeCache.get(key);
	if (cached) return cached;

	if (!appEnv.googleMapsApiKey) {
		throw new GeoError('unavailable', 'GOOGLE_MAPS_API_KEY is not configured.');
	}

	const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
	url.searchParams.set('address', address);
	url.searchParams.set('key', appEnv.googleMapsApiKey);
	url.searchParams.set('region', 'gh');
	url.searchParams.set('bounds', '6.655,-1.595|6.705,-1.545');

	const response = await fetch(url);
	if (response.status === 429) {
		throw new GeoError('quota', geoErrorMessage('quota'));
	}
	if (!response.ok) {
		throw new GeoError('unavailable', geoErrorMessage('unavailable'));
	}

	const data = (await response.json()) as {
		status: string;
		results?: Array<{
			formatted_address: string;
			place_id?: string;
			geometry: { location: { lat: number; lng: number } };
		}>;
	};

	if (data.status !== 'OK' || !data.results?.[0]) {
		throw mapGoogleStatusToGeoError(data.status);
	}

	const result = data.results[0];
	const entry: CachedGeocode = {
		address: result.formatted_address,
		lat: result.geometry.location.lat,
		lng: result.geometry.location.lng,
		placeId: result.place_id,
		cachedAt: Date.now()
	};
	serverGeocodeCache.set(key, entry);
	return entry;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ForwardBody;
		const address = body.address?.trim();
		if (!address) {
			return json(
				{ ok: false, code: 'invalid_request', message: geoErrorMessage('invalid_request') },
				{ status: 400 }
			);
		}

		const result = await geocodeForward(address);
		const inZone = containsPoint({ lat: result.lat, lng: result.lng });

		if (body.enforceZone !== false) {
			try {
				assertInZone({ lat: result.lat, lng: result.lng });
			} catch (error) {
				if (error instanceof GeoError) {
					return json(
						{
							ok: false,
							code: error.code,
							message: error.message,
							result: { ...result, inZone: false }
						},
						{ status: 422 }
					);
				}
				throw error;
			}
		}

		return json({
			ok: true,
			result: {
				address: result.address,
				lat: result.lat,
				lng: result.lng,
				placeId: result.placeId,
				inZone
			}
		});
	} catch (error) {
		if (error instanceof GeoError) {
			const status = error.code === 'quota' ? 429 : error.code === 'denied' ? 403 : 502;
			return json({ ok: false, code: error.code, message: error.message }, { status });
		}
		console.error('forward geocode failed', error);
		return json(
			{ ok: false, code: 'unavailable', message: geoErrorMessage('unavailable') },
			{ status: 502 }
		);
	}
};
