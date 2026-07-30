import { env } from '$env/dynamic/private';

import { GeoError, geoErrorMessage, mapGoogleStatusToGeoError } from '$lib/shared/geo/errors';
import {
  forwardCacheKey,
  reverseCacheKey,
  serverGeocodeCache,
  type CachedGeocode
} from '$lib/shared/geo/geocode-cache';

import { apiError } from './api-guard';

type GeocodeResponse = {
  status: string;
  results?: Array<{
    formatted_address: string;
    place_id?: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
};

/**
 * One Google Geocoding call, memoised.
 *
 * Forward and reverse geocoding differ only in which query parameters they
 * send and how they key the cache, so everything else — the API key check,
 * quota handling, status mapping and cache write — lives here once.
 */
async function geocode(cacheKey: string, params: Record<string, string>): Promise<CachedGeocode> {
  const cached = serverGeocodeCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new GeoError('unavailable', 'GOOGLE_MAPS_API_KEY is not configured.');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('key', apiKey);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const response = await fetch(url);
  if (response.status === 429) {
    throw new GeoError('quota', geoErrorMessage('quota'));
  }
  if (!response.ok) {
    throw new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  const data = (await response.json()) as GeocodeResponse;
  if (data.status !== 'OK' || !data.results?.[0]) {
    throw mapGoogleStatusToGeoError(data.status);
  }

  const [result] = data.results;
  const entry: CachedGeocode = {
    address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id
  };

  serverGeocodeCache.set(cacheKey, entry);
  return entry;
}

/** Address -> coordinates, biased to the Kumasi service area. */
export function geocodeForward(address: string) {
  return geocode(forwardCacheKey(address), {
    address,
    region: 'gh',
    bounds: '6.655,-1.595|6.705,-1.545'
  });
}

/** Coordinates -> address. */
export function geocodeReverse(lat: number, lng: number) {
  return geocode(reverseCacheKey(lat, lng), { latlng: `${lat},${lng}` });
}

/** Google's failure modes mapped onto HTTP: retryable, forbidden, or upstream. */
export function geoErrorStatus(error: GeoError) {
  if (error.code === 'quota') return 429;
  if (error.code === 'denied') return 403;
  return 502;
}

/**
 * The shared tail of both geocoding routes: surface a `GeoError` with its own
 * status, and treat anything else as an upstream failure worth logging.
 */
export function geocodeFailureResponse(error: unknown, context: string) {
  if (error instanceof GeoError) {
    return apiError(geoErrorStatus(error), error.code, error.message);
  }

  console.error(`${context} failed`, error);
  return apiError(502, 'unavailable', geoErrorMessage('unavailable'));
}
