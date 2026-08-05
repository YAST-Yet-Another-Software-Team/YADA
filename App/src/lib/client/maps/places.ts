/**
 * As-you-type address predictions for the location pickers.
 *
 * Geocoding answers "where is this address?", which needs a whole address to
 * work with — it has nothing useful to say about "ayed". Predictions are a
 * different question ("what might they be typing?"), and they are what makes a
 * search bar behave the way people expect a map's search bar to behave.
 *
 * On the OSM stack both questions go to the same place. Photon is built for
 * search-as-you-type and answers partial input directly, so predictions are the
 * same endpoint `forwardGeocode` uses, asked more often and with a shorter
 * query.
 *
 * Two things the Google implementation needed are simply gone. There are no
 * session tokens, because there is no per-session billing to batch keystrokes
 * into — Photon is free, and the debounce in the caller is now purely about not
 * being rude. And `resolveSuggestion` costs nothing: a Photon prediction already
 * carries its coordinates, where a Google prediction was an opaque handle that
 * had to be redeemed with a second billed call.
 */

import { GeoError, geoErrorMessage } from '$lib/shared/geo/errors';
import { getZoneBounds, KUMASI_CENTER } from '$lib/shared/geo/service-area';
import type { CachedGeocode } from '$lib/utils/types';

import { photonLabel } from './geocoding';

export type PlaceSuggestion = {
  id: string;
  /** The name of the place: "Unity Hall". */
  mainText: string;
  /** Where it is: "KNUST, Kumasi". Often empty. */
  secondaryText: string;
  /**
   * The resolved place. Named `prediction` for continuity with the callers, but
   * unlike Google's handle this is already the answer — see the module note.
   */
  prediction: CachedGeocode;
};

/** How many predictions to show. More than this is a list, not a shortcut. */
const MAX_SUGGESTIONS = 5;

const PHOTON = 'https://photon.komoot.io';
const REQUEST_TIMEOUT_MS = 4000;

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { osm_id?: number; osm_type?: string; [key: string]: unknown };
};

/**
 * Predictions for a partial query, biased to the KNUST service area so the
 * hostel down the road outranks its namesake on another continent.
 *
 * Returns an empty list rather than throwing when Photon is unreachable: the
 * caller still has the landmark table, Enter-to-geocode and the map itself, and
 * a search bar that can't predict is worth strictly more than an error banner.
 */
export async function fetchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const zone = getZoneBounds();
  const url =
    `${PHOTON}/api?q=${encodeURIComponent(trimmed)}` +
    `&lat=${KUMASI_CENTER.lat}&lon=${KUMASI_CENTER.lng}` +
    `&bbox=${zone.west},${zone.south},${zone.east},${zone.north}` +
    `&limit=${MAX_SUGGESTIONS}&lang=en`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let data: { features?: PhotonFeature[] };

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return [];
    data = await response.json();
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }

  return (data.features ?? [])
    .map((feature, index): PlaceSuggestion | null => {
      const coords = feature.geometry?.coordinates;
      if (!coords) return null;

      const { main, secondary } = photonLabel(feature);
      const p = feature.properties ?? {};
      const id = p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `suggestion-${index}`;

      return {
        id,
        mainText: main,
        secondaryText: secondary,
        prediction: {
          address: secondary ? `${main}, ${secondary}` : main,
          lat: coords[1],
          lng: coords[0],
          placeId: id
        }
      };
    })
    .filter((item): item is PlaceSuggestion => item != null)
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Turn a chosen prediction into the coordinate the delivery actually needs.
 *
 * Kept as an async function even though it no longer waits for anything: the
 * callers `await` it, and a provider that does need a second lookup can slot in
 * here without touching them.
 */
export async function resolveSuggestion(suggestion: PlaceSuggestion): Promise<CachedGeocode> {
  if (!suggestion.prediction) {
    throw new GeoError('no_results', geoErrorMessage('no_results'));
  }

  return suggestion.prediction;
}
