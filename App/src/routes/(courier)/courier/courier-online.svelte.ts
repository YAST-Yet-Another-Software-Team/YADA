import { getContext, setContext } from 'svelte';

import { readStored, writeStored } from '$lib/shared/local-storage';

const STORAGE_KEY = 'yada.courierOnline';

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
    this.#online = readStored(STORAGE_KEY) === 'true';
  }

  set(online: boolean) {
    this.#online = online;
    writeStored(STORAGE_KEY, online ? 'true' : 'false');
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
