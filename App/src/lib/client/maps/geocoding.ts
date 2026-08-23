import { GeoError, geoErrorMessage, mapGoogleStatusToGeoError } from '$lib/shared/geo/errors';
import { getZoneBounds } from '$lib/shared/geo/service-area';
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

/** How many matches a search offers before it stops being a shortcut. */
const MAX_FORWARD_RESULTS = 5;

/**
 * Address -> coordinates, for the search bar on the location pickers.
 *
 * Deliberately one geocode per submitted query rather than per-keystroke
 * predictions: typing is here because dropping a pin by eye is slow and
 * imprecise, not because the app went back to autocompleting place names. Every
 * result still lands as a pin the user can nudge, and the zone check applies to
 * it exactly as it does to a tap.
 *
 * Results are biased to the KNUST service area and to Ghana, so "Unity Hall"
 * resolves to the one down the road rather than an identically named building
 * on another continent.
 */
export async function forwardGeocode(apiKey: string, query: string): Promise<CachedGeocode[]> {
  if (!apiKey) {
    throw new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  const trimmed = query.trim();
  if (!trimmed) return [];

  const instance = await getGeocoder(apiKey);
  const zone = getZoneBounds();

  let results: google.maps.GeocoderResult[];

  try {
    ({ results } = await instance.geocode({
      address: trimmed,
      componentRestrictions: { country: 'gh' },
      bounds: {
        south: zone.south,
        west: zone.west,
        north: zone.north,
        east: zone.east
      }
    }));
  } catch (error) {
    const status = (error as { code?: string })?.code;

    // A query that matches nothing is an ordinary outcome of typing, not a
    // failure — the caller shows "no matches" rather than an error banner.
    if (status === 'ZERO_RESULTS') return [];

    throw status
      ? mapGoogleStatusToGeoError(status)
      : new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  return results.slice(0, MAX_FORWARD_RESULTS).map((result) => ({
    address: result.formatted_address,
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
    placeId: result.place_id
  }));
}
