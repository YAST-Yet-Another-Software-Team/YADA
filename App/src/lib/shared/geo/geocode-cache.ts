import type { CachedGeocode } from '$lib/utils/types';

import { TtlCache } from '../ttl-cache';

/** Coordinates are cached to ~1 m, so near-identical fixes share an entry. */
export function roundCoord(value: number) {
  return Math.round(value * 1e5) / 1e5;
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function reverseCacheKey(lat: number, lng: number) {
  return `rev:${roundCoord(lat)},${roundCoord(lng)}`;
}

/** Typed queries are cached by their normalised text, so casing and stray spaces share an entry. */
export function forwardCacheKey(query: string) {
  return `fwd:${normalizeAddress(query)}`;
}

/** Client-side cache, persisted so repeat Kumasi lookups skip the round-trip. */
export function createClientGeocodeCache() {
  return new TtlCache<CachedGeocode>({ persistKey: 'yada:geocode-cache-v2' });
}
