/**
 * `localStorage` access that can't take the page down.
 *
 * It is absent during SSR and throws outright when storage is disabled (Safari
 * private browsing, hardened browser settings) or over quota. A user preference
 * is never worth an exception, so both helpers fail quiet.
 */

function storage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function readStored(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Disabled or over quota — the in-memory value still applies for this session.
  }
}
