/**
 * Required Google Cloud APIs for YADA (when MAPS_ENABLED / VITE_MAPS_ENABLED=true):
 * - Maps JavaScript API
 * - Places API (New)
 * - Geocoding API
 * - Routes API
 */

import { MAPS_ENABLED } from './maps-enabled';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configuredApiKey: string | null = null;

function configure(apiKey: string) {
  if (!MAPS_ENABLED) {
    throw new Error('Maps are disabled for this environment.');
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

/** Places library including PlaceAutocompleteElement (Places API New). */
export async function loadPlaceAutocompleteElement(apiKey: string) {
  const places = await loadGoogleMapsPlaces(apiKey);
  return places;
}
