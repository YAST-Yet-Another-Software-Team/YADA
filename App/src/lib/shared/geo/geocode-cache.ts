import type { CachedGeocode } from '$lib/utils/types';

import { TtlCache } from '../ttl-cache';

/** Coordinates rounded to ~1 m, for callers that need the point itself. */
export function roundCoord(value: number) {
  return Math.round(value * 1e5) / 1e5;
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * The grid a reverse lookup is cached on: 0.0002° ≈ 22 m at this latitude.
 *
 * Deliberately far coarser than `roundCoord`. Keying a *name* to the metre
 * meant two taps on the same shopfront were two cache misses and two billed
 * lookups; a ~22 m cell is small enough that everything in it genuinely shares
 * an address and large enough that a wobbling finger doesn't pay twice. The pin
 * itself is never snapped — only the key under which its name is remembered.
 */
const REVERSE_GRID_DEG = 0.0002;

function snapToGrid(value: number) {
  return (Math.round(value / REVERSE_GRID_DEG) * REVERSE_GRID_DEG).toFixed(4);
}

export function reverseCacheKey(lat: number, lng: number) {
  return `rev:${snapToGrid(lat)},${snapToGrid(lng)}`;
}

/** Typed queries are cached by their normalised text, so casing and stray spaces share an entry. */
export function forwardCacheKey(query: string) {
  return `fwd:${normalizeAddress(query)}`;
}

/**
 * Client-side cache, persisted so repeat Kumasi lookups skip the round-trip.
 *
 * A month, not the six-hour default: what a place is called does not change on
 * that scale, and the service area is a few square kilometres that the same
 * businesses dispatch into every day. The cap is what bounds it, not the clock.
 * `v3` because the key granularity above changed — old entries would never be
 * read again, so they may as well be dropped.
 */
export function createClientGeocodeCache() {
  return new TtlCache<CachedGeocode>({
    ttlMs: 1000 * 60 * 60 * 24 * 30,
    maxEntries: 500,
    persistKey: 'yada:geocode-cache-v3'
  });
}
