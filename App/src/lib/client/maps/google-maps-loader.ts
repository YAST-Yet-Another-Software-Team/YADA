/**
 * Required Google Cloud APIs for YADA (enabled by setting GOOGLE_MAPS_API_KEY):
 * - Maps JavaScript API
 * - Places API (New)
 * - Geocoding API
 * - Routes API
 *
 * The key is supplied by the caller rather than read here, because it arrives
 * at runtime through the root layout — see `./maps-config.svelte`.
 */

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configuredApiKey: string | null = null;

function configure(apiKey: string) {
  if (!apiKey) {
    throw new Error('Google Maps is not configured (GOOGLE_MAPS_API_KEY is unset).');
  }
  if (configuredApiKey !== apiKey) {
    setOptions({ key: apiKey, v: 'weekly' });
    configuredApiKey = apiKey;
  }
}

export function loadGoogleMaps(apiKey: string) {
  configure(apiKey);
  return importLibrary('maps');
}

export function loadGoogleMapsGeocoding(apiKey: string) {
  configure(apiKey);
  return importLibrary('geocoding');
}

export function loadGoogleMapsPlaces(apiKey: string) {
  configure(apiKey);
  return importLibrary('places');
}

export function loadGoogleMapsRoutes(apiKey: string) {
  configure(apiKey);
  return importLibrary('routes');
}

/** `AdvancedMarkerElement` and `PinElement`, which replace `google.maps.Marker`. */
export function loadGoogleMapsMarker(apiKey: string) {
  configure(apiKey);
  return importLibrary('marker');
}
