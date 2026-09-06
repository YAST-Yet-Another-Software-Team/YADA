/**
 * As-you-type address predictions for the location pickers.
 *
 * Geocoding answers "where is this address?", which needs a whole address to
 * work with — it has nothing useful to say about "ayed". Predictions are a
 * different service for a different question ("what might they be typing?"),
 * and they are what makes a search bar behave the way people expect a map's
 * search bar to behave.
 *
 * Billing note: predictions are charged per *session*, not per keystroke — a
 * run of keystrokes plus the place lookup that follows count as one, as long as
 * they share a session token. `startSession` mints one; `resolveSuggestion`
 * closes it, and the next keystroke opens the next. Getting this wrong is the
 * difference between one charge and one per letter typed.
 */

import {
  GeoError,
  geoErrorMessage,
  mapGoogleStatusToGeoError,
} from "$lib/shared/geo/errors";
import { getZoneBounds } from "$lib/shared/geo/service-area";
import type { CachedGeocode } from "$lib/utils/types";

import { loadGoogleMapsPlaces } from "./google-maps-loader";

export type PlaceSuggestion = {
  id: string;
  /** The name of the place: "Unity Hall". */
  mainText: string;
  /** Where it is: "KNUST, Kumasi". Often empty. */
  secondaryText: string;
  /** Opaque handle used by `resolveSuggestion` to fetch coordinates. */
  prediction: PlacePrediction;
};

type PlaceLike = {
  fetchFields?: (options: { fields: string[] }) => Promise<unknown>;
  formattedAddress?: string;
  displayName?: string | { text?: string };
  id?: string;
  location?:
    { lat: () => number; lng: () => number } | { lat: number; lng: number };
};

type PlacePrediction = {
  placeId?: string;
  text?: { text?: string } | string;
  mainText?: { text?: string } | string;
  secondaryText?: { text?: string } | string;
  toPlace: () => Promise<PlaceLike> | PlaceLike;
};

type PlacesNamespace = {
  AutocompleteSessionToken?: new () => unknown;
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions: (
      request: Record<string, unknown>,
    ) => Promise<{
      suggestions?: Array<{ placePrediction?: PlacePrediction }>;
    }>;
  };
};

/** How many predictions to show. More than this is a list, not a shortcut. */
const MAX_SUGGESTIONS = 5;

let placesReady = false;
let sessionToken: unknown = null;

async function places(apiKey: string): Promise<PlacesNamespace> {
  if (!apiKey)
    throw new GeoError("unavailable", geoErrorMessage("unavailable"));

  if (!placesReady) {
    await loadGoogleMapsPlaces(apiKey);
    placesReady = true;
  }

  return google.maps.places as unknown as PlacesNamespace;
}

function textOf(value: { text?: string } | string | undefined) {
  return typeof value === "string" ? value : (value?.text ?? "");
}

/**
 * Begin a billing session, if one isn't already open. Called on the first
 * keystroke of a search rather than on every one.
 */
async function ensureSession(api: PlacesNamespace) {
  if (!sessionToken && api.AutocompleteSessionToken) {
    sessionToken = new api.AutocompleteSessionToken();
  }
}

/**
 * Predictions for a partial query, biased to the KNUST service area so the
 * hostel down the road outranks its namesake on another continent.
 *
 * Returns an empty list rather than throwing when Places isn't available in the
 * loaded SDK: the caller still has Enter-to-geocode and the map itself, and a
 * search bar that can't predict is worth strictly more than an error banner.
 */
export async function fetchPlaceSuggestions(
  apiKey: string,
  query: string,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const api = await places(apiKey);
  if (!api.AutocompleteSuggestion?.fetchAutocompleteSuggestions) return [];

  await ensureSession(api);

  const zone = getZoneBounds();
  const { suggestions } =
    await api.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      includedRegionCodes: ["gh"],
      language: "en",
      sessionToken: sessionToken ?? undefined,
      locationBias: {
        west: zone.west,
        south: zone.south,
        east: zone.east,
        north: zone.north,
      },
    });

  return (suggestions ?? [])
    .map((item, index): PlaceSuggestion | null => {
      const prediction = item.placePrediction;
      if (!prediction) return null;

      const main =
        textOf(prediction.mainText) || textOf(prediction.text) || trimmed;

      return {
        id: prediction.placeId ?? `suggestion-${index}`,
        mainText: main,
        secondaryText: textOf(prediction.secondaryText),
        prediction,
      };
    })
    .filter((item): item is PlaceSuggestion => item != null)
    .slice(0, MAX_SUGGESTIONS);
}

/** Turn a chosen prediction into the coordinate the delivery actually needs. */
export async function resolveSuggestion(
  suggestion: PlaceSuggestion,
): Promise<CachedGeocode> {
  let place: PlaceLike;

  try {
    place = await Promise.resolve(suggestion.prediction.toPlace());
    if (typeof place.fetchFields === "function") {
      await place.fetchFields({
        fields: ["formattedAddress", "location", "displayName", "id"],
      });
    }
  } catch (error) {
    const status = (error as { code?: string })?.code;
    throw status
      ? mapGoogleStatusToGeoError(status)
      : new GeoError("unavailable", geoErrorMessage("unavailable"));
  } finally {
    // The lookup closes the session whether or not it succeeded; a token is only
    // good for one resolution either way.
    sessionToken = null;
  }

  const location = place.location;
  if (!location) throw mapGoogleStatusToGeoError("ZERO_RESULTS");

  const displayName =
    typeof place.displayName === "string"
      ? place.displayName
      : place.displayName?.text;

  return {
    address: place.formattedAddress ?? displayName ?? suggestion.mainText,
    lat: typeof location.lat === "function" ? location.lat() : location.lat,
    lng: typeof location.lng === "function" ? location.lng() : location.lng,
    placeId: place.id ?? suggestion.id,
  };
}
