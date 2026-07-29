import type { LatLng } from '$lib/geo/service-area';
import type { GeoErrorCode } from '$lib/geo/errors';
import {
	createClientGeocodeCache,
	forwardCacheKey,
	reverseCacheKey
} from '$lib/geo/geocode-cache';

export type GeocodeResult = {
	address: string;
	lat: number;
	lng: number;
	placeId?: string;
	inZone: boolean;
};

export type GeocodeResponse =
	| { ok: true; result: GeocodeResult }
	| { ok: false; code: GeoErrorCode; message: string; result?: GeocodeResult };

const cache = createClientGeocodeCache();

export async function forwardGeocode(
	address: string,
	options?: { enforceZone?: boolean }
): Promise<GeocodeResponse> {
	const key = forwardCacheKey(address);
	const cached = cache.get(key);
	if (cached) {
		const { containsPoint } = await import('$lib/geo/service-area');
		const inZone = containsPoint({ lat: cached.lat, lng: cached.lng });
		if (options?.enforceZone !== false && !inZone) {
			return {
				ok: false,
				code: 'out_of_zone',
				message: 'Outside YADA delivery area (KNUST/Ayeduase).',
				result: { ...cached, inZone: false }
			};
		}
		return {
			ok: true,
			result: {
				address: cached.address,
				lat: cached.lat,
				lng: cached.lng,
				placeId: cached.placeId,
				inZone
			}
		};
	}

	const response = await fetch('/api/geo/forward', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ address, enforceZone: options?.enforceZone ?? true })
	});
	const data = (await response.json()) as GeocodeResponse;
	if (data.ok) {
		cache.set(key, {
			address: data.result.address,
			lat: data.result.lat,
			lng: data.result.lng,
			placeId: data.result.placeId
		});
	}
	return data;
}

export async function reverseGeocode(point: LatLng): Promise<GeocodeResponse> {
	const key = reverseCacheKey(point.lat, point.lng);
	const cached = cache.get(key);
	if (cached) {
		const { containsPoint } = await import('$lib/geo/service-area');
		return {
			ok: true,
			result: {
				address: cached.address,
				lat: cached.lat,
				lng: cached.lng,
				placeId: cached.placeId,
				inZone: containsPoint({ lat: point.lat, lng: point.lng })
			}
		};
	}

	const response = await fetch('/api/geo/reverse', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(point)
	});
	const data = (await response.json()) as GeocodeResponse;
	if (data.ok) {
		cache.set(key, {
			address: data.result.address,
			lat: data.result.lat,
			lng: data.result.lng,
			placeId: data.result.placeId
		});
	}
	return data;
}
