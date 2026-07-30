type Entry<T> = { value: T; cachedAt: number };

/**
 * A bounded, expiring cache with optional `localStorage` persistence.
 *
 * Eviction is insertion-ordered and `get` re-inserts on a hit, which makes
 * `Map` iteration order an LRU queue — the oldest key is the first one out.
 * Persistence is a no-op outside the browser, so the same class backs the
 * server-side geocode cache and the client-side route cache.
 */
export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly persistKey?: string;

  constructor(options?: { ttlMs?: number; maxEntries?: number; persistKey?: string }) {
    this.ttlMs = options?.ttlMs ?? 1000 * 60 * 60 * 6;
    this.maxEntries = options?.maxEntries ?? 200;
    this.persistKey = options?.persistKey;
    this.restore();
  }

  get(key: string): T | null {
    const hit = this.store.get(key);
    if (!hit) return null;

    if (Date.now() - hit.cachedAt > this.ttlMs) {
      this.store.delete(key);
      this.persist();
      return null;
    }

    // Re-insert to move the key to the back of the eviction queue.
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key: string, value: T, cachedAt = Date.now()) {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }

    this.store.set(key, { value, cachedAt });
    this.persist();
  }

  private get storage() {
    if (!this.persistKey || typeof localStorage === 'undefined') return null;
    return localStorage;
  }

  private restore() {
    const storage = this.storage;
    if (!storage) return;

    try {
      const raw = storage.getItem(this.persistKey!);
      if (!raw) return;

      for (const [key, entry] of JSON.parse(raw) as Array<[string, Entry<T>]>) {
        // Skip anything that isn't in the current entry shape — a persisted
        // cache from an older build would otherwise be read back as a value.
        if (entry && typeof entry.cachedAt === 'number' && entry.value !== undefined) {
          this.store.set(key, entry);
        }
      }
    } catch {
      // A corrupt cache is not worth failing over — start empty.
    }
  }

  private persist() {
    const storage = this.storage;
    if (!storage) return;

    try {
      storage.setItem(this.persistKey!, JSON.stringify([...this.store.entries()]));
    } catch {
      // Over quota, or storage disabled. The cache still works in memory.
    }
  }
}
