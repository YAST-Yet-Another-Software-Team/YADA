import { getContext, setContext } from 'svelte';

/**
 * Map configuration for the OpenStreetMap stack.
 *
 * The Google build carried a browser API key here because the Maps JavaScript
 * API authenticates the browser itself. Nothing in this stack does: OSM tiles
 * are served without a key, and Photon geocodes without one. The single
 * credential left — the OpenRouteService key — never reaches the browser at all,
 * because ORS keys cannot be referrer-locked the way Google's browser key could.
 * Routing is proxied through `/api/geo/route` instead, so all the client needs
 * to know is *whether* the server has a key.
 *
 * Still delivered through context rather than `import.meta.env`, for the reason
 * `$auth/session.svelte` documents: a module-level value would be shared by every
 * in-flight SSR request.
 */
export class MapsConfig {
  #styleUrl = $state('');
  #routingEnabled = $state(false);

  constructor(styleUrl: string, routingEnabled: boolean) {
    this.#styleUrl = styleUrl;
    this.#routingEnabled = routingEnabled;
  }

  /** MapLibre style document — tiles, glyphs and layers in one URL. */
  get styleUrl() {
    return this.#styleUrl;
  }

  /**
   * Whether the map can draw at all. Unlike the Google build, where this
   * tracked a key and was routinely false, tiles here need no credential — so
   * this is false only if someone deliberately blanks the style URL.
   */
  get enabled() {
    return this.#styleUrl.length > 0;
  }

  /**
   * Whether `/api/geo/route` has an ORS key behind it. Callers check this before
   * asking for a route; without it the map still renders, pins still drop, and
   * the app falls back to straight-line estimates.
   */
  get routingEnabled() {
    return this.#routingEnabled;
  }

  /** Re-seed when a later navigation reruns the root layout load. */
  hydrate(styleUrl: string, routingEnabled: boolean) {
    this.#styleUrl = styleUrl;
    this.#routingEnabled = routingEnabled;
  }
}

const MAPS_KEY = Symbol('yada.maps');

/** Provide the map config for the whole app. Called once, by the root layout. */
export function createMapsConfig(styleUrl: string, routingEnabled: boolean) {
  return setContext(MAPS_KEY, new MapsConfig(styleUrl, routingEnabled));
}

/** Read the map config the root layout provided. */
export function getMapsConfig(): MapsConfig {
  const config = getContext<MapsConfig | undefined>(MAPS_KEY);

  if (!config) {
    throw new Error('getMapsConfig() was called outside the root layout, which provides it.');
  }

  return config;
}
