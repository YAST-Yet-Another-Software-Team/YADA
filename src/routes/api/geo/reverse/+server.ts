import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { appEnv } from '$lib/server/env';
import { GeoError, geoErrorMessage, mapGoogleStatusToGeoError } from '$lib/geo/errors';
import {
	reverseCacheKey,
	serverGeocodeCache,
	type CachedGeocode
} from '$lib/geo/geocode-cache';
import { containsPoint } from '$lib/geo/service-area';

type ReverseBody = {
	lat?: number;
	lng?: number;
};

async function geocodeReverse(lat: number, lng: number): Promise<CachedGeocode> {
	const key = reverseCacheKey(lat, lng);
	const cached = serverGeocodeCache.get(key);
	if (cached) return cached;

	if (!appEnv.googleMapsApiKey) {
		throw new GeoError('unavailable', 'GOOGLE_MAPS_API_KEY is not configured.');
	}

	const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
	url.searchParams.set('latlng', `${lat},${lng}`);
	url.searchParams.set('key', appEnv.googleMapsApiKey);

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
		const body = (await request.json()) as ReverseBody;
		const lat = Number(body.lat);
		const lng = Number(body.lng);

		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			return json(
				{ ok: false, code: 'invalid_request', message: geoErrorMessage('invalid_request') },
				{ status: 400 }
			);
		}

		const result = await geocodeReverse(lat, lng);
		return json({
			ok: true,
			result: {
				address: result.address,
				lat: result.lat,
				lng: result.lng,
				placeId: result.placeId,
				inZone: containsPoint({ lat, lng })
			}
		});
	} catch (error) {
		if (error instanceof GeoError) {
			const status = error.code === 'quota' ? 429 : error.code === 'denied' ? 403 : 502;
			return json({ ok: false, code: error.code, message: error.message }, { status });
		}
		console.error('reverse geocode failed', error);
		return json(
			{ ok: false, code: 'unavailable', message: geoErrorMessage('unavailable') },
			{ status: 502 }
		);
	}
};
