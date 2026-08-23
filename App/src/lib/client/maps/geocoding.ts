import { GeoError, geoErrorMessage } from '$lib/shared/geo/errors';
import { getZoneBounds, KUMASI_CENTER } from '$lib/shared/geo/service-area';
import type { CachedGeocode, LatLng } from '$lib/utils/types';

/**
 * Addresses, from Photon with Nominatim as the fallback.
 *
 * Both are keyless and both read the same OSM database, so the fallback is a
 * second opinion on the same data rather than a different product. Photon is
 * first because it is built for interactive use — it answers partial input,
 * which is what makes it serve predictions as well as lookups (see `./places`).
 *
 * Nominatim's usage policy is strict about volume; it sits behind Photon and
 * behind the landmark table and the geocode cache, so in practice it is reached
 * only when Photon is down. Keep it that way.
 *
 * No API key parameter anywhere in this module: neither service takes one.
 */

const PHOTON = 'https://photon.komoot.io';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

/** How many matches a search offers before it stops being a shortcut. */
const MAX_FORWARD_RESULTS = 5;

/** A slow geocoder should fail to the landmark table, not hang the pin. */
const REQUEST_TIMEOUT_MS = 6000;

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (response.status === 429) {
      throw new GeoError('quota', geoErrorMessage('quota'));
    }
    if (!response.ok) {
      throw new GeoError('unavailable', geoErrorMessage('unavailable'));
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A Photon feature is GeoJSON with the address split across properties. There is
 * no single formatted-address field, so one is assembled — name first, because
 * "Unity Hall" is what someone recognises, then enough context to disambiguate.
 */
type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_id?: number;
    osm_type?: string;
  };
};

export function photonLabel(feature: PhotonFeature): { main: string; secondary: string } {
  const p = feature.properties ?? {};

  const street = p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street;
  const main = p.name || street || p.district || p.city || 'Pinned location';

  // Everything that isn't the name, in widening order, deduplicated — Photon
  // repeats the city as the county often enough to matter.
  const context = [street === main ? undefined : street, p.district, p.city, p.county, p.state]
    .filter((part): part is string => Boolean(part) && part !== main)
    .filter((part, index, all) => all.indexOf(part) === index);

  return { main, secondary: context.slice(0, 2).join(', ') };
}

function photonToGeocode(feature: PhotonFeature): CachedGeocode | null {
  const coords = feature.geometry?.coordinates;
  if (!coords) return null;

  const { main, secondary } = photonLabel(feature);
  const p = feature.properties ?? {};

  return {
    address: secondary ? `${main}, ${secondary}` : main,
    lat: coords[1],
    lng: coords[0],
    placeId: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : undefined
  };
}

/**
 * Coordinates -> address.
 *
 * Photon first, Nominatim second. A miss from both is `no_results`, which the
 * picker treats as "the table's name for it, or 'Pinned location'" rather than
 * as an error — an unnamed pin is still a perfectly good delivery target.
 */
export async function reverseGeocode(point: LatLng): Promise<CachedGeocode> {
  try {
    const data = (await getJson(
      `${PHOTON}/reverse?lat=${point.lat}&lon=${point.lng}&lang=en`
    )) as { features?: PhotonFeature[] };

    const resolved = data.features?.map(photonToGeocode).find((entry) => entry != null);
    if (resolved) return resolved;
  } catch (error) {
    if (error instanceof GeoError && error.code === 'quota') throw error;
    // Fall through to Nominatim.
  }

  let data: { display_name?: string; lat?: string; lon?: string; osm_id?: number };

  try {
    data = (await getJson(
      `${NOMINATIM}/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}&zoom=18&accept-language=en`
    )) as typeof data;
  } catch (error) {
    if (error instanceof GeoError) throw error;
    throw new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  if (!data.display_name) {
    throw new GeoError('no_results', geoErrorMessage('no_results'));
  }

  return {
    address: data.display_name,
    lat: data.lat ? Number(data.lat) : point.lat,
    lng: data.lon ? Number(data.lon) : point.lng,
    placeId: data.osm_id ? String(data.osm_id) : undefined
  };
}

/**
 * Address -> coordinates, for the search bar on the location pickers.
 *
 * Biased to the KNUST service area so "Unity Hall" resolves to the one down the
 * road rather than an identically named building on another continent. Photon
 * takes a bias point plus a bounding box; results outside the zone are dropped
 * by the caller, which already does that for taps.
 */
export async function forwardGeocode(query: string): Promise<CachedGeocode[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const zone = getZoneBounds();
  const url =
    `${PHOTON}/api?q=${encodeURIComponent(trimmed)}` +
    `&lat=${KUMASI_CENTER.lat}&lon=${KUMASI_CENTER.lng}` +
    `&bbox=${zone.west},${zone.south},${zone.east},${zone.north}` +
    `&limit=${MAX_FORWARD_RESULTS}&lang=en`;

  const data = (await getJson(url)) as { features?: PhotonFeature[] };

  return (data.features ?? [])
    .map(photonToGeocode)
    .filter((entry): entry is CachedGeocode => entry != null)
    .slice(0, MAX_FORWARD_RESULTS);
}
