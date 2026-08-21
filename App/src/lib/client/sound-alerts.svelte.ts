import { getContext, setContext } from "svelte";

import { playBell, unlockAudio } from "./sound";

/** Same `yada.<name>` convention as `yada.courierTheme` and `yada.courierOnline`. */
const STORAGE_KEY = "yada.soundAlerts";

function readEnabled() {
  try {
    // Absent means on. A rider who has never opened settings should still be
    // told when a delivery starts ringing them — that is the whole feature.
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Private-mode Safari and locked-down webviews throw on write. The choice
    // still applies for this session; it just will not survive a reload.
  }
}

/**
 * Whether alerts make a sound, and the memory of what has already been announced.
 *
 * The seen-offer ids live here rather than on a page because Home and Orders
 * render the same `pendingRequests`: with per-page memory, a rider switching
 * tabs would be rung again for an offer they are already looking at.
 */
export class SoundAlerts {
  #enabled = $state(true);
  #seenOffers = new Set<string>();
  #primed = false;

  get enabled() {
    return this.#enabled;
  }

  /**
   * Adopt the stored choice. Called from a layout `$effect`, never the
   * constructor — there is no `localStorage` during SSR.
   */
  hydrate() {
    this.#enabled = readEnabled();
  }

  set(enabled: boolean) {
    this.#enabled = enabled;
    writeEnabled(enabled);

    // Turning it on is a click, so it is also the gesture the browser wants
    // before it will let anything play. Take it.
    if (enabled) unlockAudio();
  }

  /** Ring, unless the person has asked us not to. */
  notify() {
    if (this.#enabled) playBell();
  }

  /**
   * Announce any offer id that wasn't in the last set.
   *
   * The first payload only seeds: opening the app onto an offer that was already
   * ringing is not news, and a bell on every page load would train riders to
   * ignore it. Ids that have gone are forgotten, so a request that times out and
   * is re-rung later announces itself again.
   */
  announceOffers(offerIds: string[]) {
    const incoming = new Set(offerIds);

    if (!this.#primed) {
      this.#primed = true;
      this.#seenOffers = incoming;
      return;
    }

    const isNew = offerIds.some((id) => !this.#seenOffers.has(id));
    this.#seenOffers = incoming;

    if (isNew) this.notify();
  }
}

const KEY = Symbol("yada.soundAlerts");

/**
 * Created once in the root layout, because both workspaces ring: couriers for a
 * new offer, businesses for the three points of a delivery. Context rather than
 * module scope for the reason spelled out in `maps-config.svelte` — module-level
 * `$state` on the server is shared by every in-flight SSR request.
 */
export function createSoundAlerts() {
  return setContext(KEY, new SoundAlerts());
}

export function getSoundAlerts() {
  const alerts = getContext<SoundAlerts | undefined>(KEY);
  if (!alerts) {
    throw new Error("getSoundAlerts() called outside the root layout.");
  }
  return alerts;
}
