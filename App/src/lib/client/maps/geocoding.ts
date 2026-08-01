import { GeoError, geoErrorMessage, mapGoogleStatusToGeoError } from '$lib/shared/geo/errors';
import type { CachedGeocode, LatLng } from '$lib/utils/types';

import { loadGoogleMapsGeocoding } from './google-maps-loader';

let geocoder: google.maps.Geocoder | null = null;

async function getGeocoder(apiKey: string) {
  if (!geocoder) {
    const { Geocoder } = await loadGoogleMapsGeocoding(apiKey);
    geocoder = new Geocoder();
  }

  return geocoder;
}

/**
 * Coordinates -> address, through the Maps JS Geocoding library.
 *
 * This runs in the browser on the same key that renders the map. It used to be
 * proxied through `/api/geo/reverse` on a separate server key; that split is
 * gone because a single key cannot be both HTTP-referrer-restricted for the
 * browser and usable from server-side `?key=` calls.
 *
 * Google rejects with a status string rather than an HTTP status, so failures
 * are funnelled through the same `mapGoogleStatusToGeoError` the server used —
 * callers keep rendering the same `GeoError` codes they always did.
 */
export async function reverseGeocode(apiKey: string, point: LatLng): Promise<CachedGeocode> {
  if (!apiKey) {
    throw new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  const instance = await getGeocoder(apiKey);

  let results: google.maps.GeocoderResult[];

  try {
    ({ results } = await instance.geocode({ location: { lat: point.lat, lng: point.lng } }));
  } catch (error) {
    const status = (error as { code?: string })?.code;
    throw status ? mapGoogleStatusToGeoError(status) : new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  const [result] = results;

  if (!result) {
    throw mapGoogleStatusToGeoError('ZERO_RESULTS');
  }

  return {
    address: result.formatted_address,
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
    placeId: result.place_id
  };
}
