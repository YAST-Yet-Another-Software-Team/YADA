import { getContext, setContext } from 'svelte';

const STORAGE_KEY = 'yada.courierOnline';

/**
 * Persistence for this one flag.
 *
 * Both directions fail quiet: `localStorage` doesn't exist during SSR, and it
 * throws outright when storage is disabled (Safari private browsing, hardened
 * settings) or over quota. Staying online is never worth an exception, and the
 * in-memory value still applies for the session either way.
 */
function readOnline(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeOnline(online: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, online ? 'true' : 'false');
  } catch {
    // Absent, disabled, or over quota.
  }
}

/**
 * Whether the courier is currently accepting delivery requests.
 *
 * Persisted so it survives a reload, but deliberately starts `false`: the
 * server can't read localStorage, so adopting the stored value before mount
 * would make the server-rendered markup disagree with the client's. The
 * courier layout calls `hydrate()` once the page is live.
 */
export class CourierOnline {
  #online = $state(false);

  get online() {
    return this.#online;
  }

  /** Adopt the persisted value. Safe to call more than once. */
  hydrate() {
    this.#online = readOnline();
  }

  set(online: boolean) {
    this.#online = online;
    writeOnline(online);
  }

  goOnline() {
    this.set(true);
  }

  goOffline() {
    this.set(false);
  }
}

const COURIER_ONLINE_KEY = Symbol('yada.courierOnline');

/** Provide the flag for the courier workspace. Called once, by its layout. */
export function createCourierOnline() {
  return setContext(COURIER_ONLINE_KEY, new CourierOnline());
}

/** Read the flag the courier layout provided. */
export function getCourierOnline(): CourierOnline {
  const online = getContext<CourierOnline | undefined>(COURIER_ONLINE_KEY);

  if (!online) {
    throw new Error('getCourierOnline() was called outside the courier layout, which provides it.');
  }

  return online;
}
