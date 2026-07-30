import { roundCoord } from '$lib/shared/geo/geocode-cache';
import { TtlCache } from '$lib/shared/ttl-cache';

import type { DrivingRouteResult } from './routing';

export function routeCacheKey(
	origin: { lat: number; lng: number },
	destination: { lat: number; lng: number }
) {
	return `route:${roundCoord(origin.lat)},${roundCoord(origin.lng)}->${roundCoord(destination.lat)},${roundCoord(destination.lng)}`;
}

/** Routes go stale faster than addresses do, hence the shorter TTL. */
export const clientRouteCache = new TtlCache<DrivingRouteResult>({
	ttlMs: 1000 * 60 * 30,
	maxEntries: 100,
	persistKey: 'yada:route-cache-v2'
});
