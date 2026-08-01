import { getContext, setContext } from 'svelte';

/**
 * The browser-visible Google Maps credentials.
 *
 * The Maps JavaScript API authenticates the browser directly — Google serves
 * tiles to a `<script src="...?key=">` it loads itself — so this key genuinely
 * has to cross to the client. It is protected by an HTTP-referrer restriction
 * and a quota cap in Google Cloud, not by secrecy.
 *
 * Delivered through context rather than `import.meta.env` for two reasons: the
 * value is read at runtime, so rotating the key needs a restart instead of a
 * rebuild; and, as `$auth/session.svelte` documents for the same pattern, a
 * module-level value would be shared by every in-flight SSR request.
 */
export class MapsConfig {
  #apiKey = $state('');
  #mapId = $state('');

  constructor(apiKey: string, mapId: string) {
    this.#apiKey = apiKey;
    this.#mapId = mapId;
  }

  get apiKey() {
    return this.#apiKey;
  }

  /** Map ID for `AdvancedMarkerElement`, which will not render without one. */
  get mapId() {
    return this.#mapId;
  }

  /** Whether maps can load at all — having a key *is* the enabled signal. */
  get enabled() {
    return this.#apiKey.length > 0;
  }

  /** Re-seed when a later navigation reruns the root layout load. */
  hydrate(apiKey: string, mapId: string) {
    this.#apiKey = apiKey;
    this.#mapId = mapId;
  }
}

const MAPS_KEY = Symbol('yada.maps');

/** Provide the Maps config for the whole app. Called once, by the root layout. */
export function createMapsConfig(apiKey: string, mapId: string) {
  return setContext(MAPS_KEY, new MapsConfig(apiKey, mapId));
}

/** Read the Maps config the root layout provided. */
export function getMapsConfig(): MapsConfig {
  const config = getContext<MapsConfig | undefined>(MAPS_KEY);

  if (!config) {
    throw new Error('getMapsConfig() was called outside the root layout, which provides it.');
  }

  return config;
}
