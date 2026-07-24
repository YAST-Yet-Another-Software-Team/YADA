import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

/**
 * Required Google Cloud APIs for YADA:
 * - Maps JavaScript API
 * - Places API (New) — PlaceAutocompleteElement
 * - Geocoding API
 * - Routes API
 */

let configuredApiKey: string | null = null;

function configure(apiKey: string) {
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
