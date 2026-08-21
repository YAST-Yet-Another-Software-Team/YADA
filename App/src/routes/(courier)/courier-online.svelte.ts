import { getContext, setContext } from "svelte";

const STORAGE_KEY = "yada.courierOnline";

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
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeOnline(online: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, online ? "true" : "false");
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
  #error = $state("");

  get online() {
    return this.#online;
  }

  /**
   * Why the last toggle didn't stick, if it didn't. Empty the rest of the time.
   * Cleared by the next attempt.
   */
  get error() {
    return this.#error;
  }

  /** Adopt the persisted value. Safe to call more than once. */
  hydrate() {
    this.#online = readOnline();
  }

  async set(online: boolean) {
    // Flip first: the toggle has to feel immediate, and the common case is
    // that the server agrees.
    const previous = this.#online;
    this.#online = online;
    this.#error = "";
    writeOnline(online);

    // The server has to know too: dispatch rings by availability, and going
    // offline must stop the ringing at once — a location fix stays fresh for
    // minutes after a courier clocks off.
    //
    // The answer is read rather than discarded. The server can refuse — an
    // unconfirmed email may not go online — and a rejection that left the pill
    // reading "Online" would be the exact desync this flag exists to prevent:
    // a rider who believes they are on shift while dispatch cannot see them.
    // A network failure is different: the request may well have landed, and
    // the stored value still describes what the rider asked for.
    try {
      const response = await fetch("/api/courier/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        this.#online = previous;
        writeOnline(previous);
        this.#error = payload?.message ?? "That didn't go through. Try again.";
      }
    } catch {
      // Offline or interrupted. The optimistic value stands; the fix going
      // stale is the backstop it always was.
    }
  }

  // `set` reports through `error` rather than by rejecting, so these two don't
  // wait on it — the pill has already moved by the time it resolves.
  goOnline() {
    void this.set(true);
  }

  goOffline() {
    void this.set(false);
  }
}

const COURIER_ONLINE_KEY = Symbol("yada.courierOnline");

/** Provide the flag for the courier workspace. Called once, by its layout. */
export function createCourierOnline() {
  return setContext(COURIER_ONLINE_KEY, new CourierOnline());
}

/** Read the flag the courier layout provided. */
export function getCourierOnline(): CourierOnline {
  const online = getContext<CourierOnline | undefined>(COURIER_ONLINE_KEY);

  if (!online) {
    throw new Error(
      "getCourierOnline() was called outside the courier layout, which provides it.",
    );
  }

  return online;
}
