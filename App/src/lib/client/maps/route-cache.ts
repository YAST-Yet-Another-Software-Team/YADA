import { browser } from '$app/environment';

import type { DrivingRouteResult } from './routing';

type CachedRoute = {
	result: DrivingRouteResult;
	cachedAt: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 30;
const DEFAULT_MAX_ENTRIES = 100;

export function routeCacheKey(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
	const round = (value: number) => Math.round(value * 1e5) / 1e5;
	return `route:${round(origin.lat)},${round(origin.lng)}->${round(destination.lat)},${round(destination.lng)}`;
}

class RouteCache {
	private store = new Map<string, CachedRoute>();
	private readonly ttlMs: number;
	private readonly maxEntries: number;
	private readonly persistKey?: string;

	constructor(options?: { ttlMs?: number; maxEntries?: number; persistKey?: string }) {
		this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
		this.maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
		this.persistKey = options?.persistKey;

		if (this.persistKey && browser && typeof localStorage !== 'undefined') {
			try {
				const raw = localStorage.getItem(this.persistKey);
				if (raw) {
					const parsed = JSON.parse(raw) as Array<[string, CachedRoute]>;
					for (const [key, value] of parsed) {
						this.store.set(key, value);
					}
				}
			} catch {
				// ignore corrupt cache
			}
		}
	}

	get(key: string): DrivingRouteResult | null {
		const hit = this.store.get(key);
		if (!hit) return null;
		if (Date.now() - hit.cachedAt > this.ttlMs) {
			this.store.delete(key);
			this.persist();
			return null;
		}

		this.store.delete(key);
		this.store.set(key, hit);
		return hit.result;
	}

	set(key: string, result: DrivingRouteResult) {
		if (this.store.size >= this.maxEntries) {
			const oldest = this.store.keys().next().value;
			if (oldest) this.store.delete(oldest);
		}

		this.store.set(key, { result, cachedAt: Date.now() });
		this.persist();
	}

	private persist() {
		if (!this.persistKey || !browser || typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(this.persistKey, JSON.stringify([...this.store.entries()]));
		} catch {
			// ignore quota
		}
	}
}

export const clientRouteCache = new RouteCache({ persistKey: 'yada:route-cache' });