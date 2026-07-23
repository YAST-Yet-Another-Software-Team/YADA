import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configuredApiKey: string | null = null;

export function loadGoogleMaps(apiKey: string) {
  if (configuredApiKey !== apiKey) {
    setOptions({ key: apiKey, v: 'weekly' });
    configuredApiKey = apiKey;
  }

  return importLibrary('maps');
}