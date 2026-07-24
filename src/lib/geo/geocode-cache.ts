export type CachedGeocode = {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  cachedAt: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_ENTRIES = 200;

function normalizeAddress(address: string) {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

function roundCoord(value: number) {
  return Math.round(value * 1e5) / 1e5;
}

export function reverseCacheKey(lat: number, lng: number) {
  return `rev:${roundCoord(lat)},${roundCoord(lng)}`;
}

export function forwardCacheKey(address: string) {
  return `fwd:${normalizeAddress(address)}`;
}

export function placeCacheKey(placeId: string) {
  return `place:${placeId}`;
}

export class GeocodeCache {
  private store = new Map<string, CachedGeocode>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly persistKey?: string;

  constructor(options?: { ttlMs?: number; maxEntries?: number; persistKey?: string }) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options?.maxEntries ?? MAX_ENTRIES;
    this.persistKey = options?.persistKey;

    if (this.persistKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.persistKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Array<[string, CachedGeocode]>;
          for (const [key, value] of parsed) {
            this.store.set(key, value);
          }
        }
      } catch {
        // ignore corrupt cache
      }
    }
  }

  get(key: string): CachedGeocode | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() - hit.cachedAt > this.ttlMs) {
      this.store.delete(key);
      this.persist();
      return null;
    }
    // refresh LRU order
    this.store.delete(key);
    this.store.set(key, hit);
    return hit;
  }

  set(key: string, value: Omit<CachedGeocode, 'cachedAt'> & { cachedAt?: number }) {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { ...value, cachedAt: value.cachedAt ?? Date.now() });
    this.persist();
  }

  private persist() {
    if (!this.persistKey || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.persistKey, JSON.stringify([...this.store.entries()]));
    } catch {
      // ignore quota
    }
  }
}

/** Shared in-memory cache for server (and client when imported). */
export const serverGeocodeCache = new GeocodeCache({ persistKey: undefined });

/** Client-side cache with localStorage for Kumasi geocodes. */
export function createClientGeocodeCache() {
  return new GeocodeCache({ persistKey: 'yada:kumasi-geocode-cache' });
}
