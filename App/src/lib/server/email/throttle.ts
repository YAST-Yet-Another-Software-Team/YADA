import { TtlCache } from '$lib/shared/ttl-cache';

/**
 * One send per address per minute, for the two endpoints a stranger can aim at
 * someone else's inbox: "resend my verification" and "reset my password".
 *
 * Better Auth ships exactly this rule — 3 per 60s on `/send-verification-email`
 * and `/request-password-reset` — but it is enforced in the HTTP router's
 * `onRequest`, and every call this app makes goes through `auth.api.*` in
 * process. Those never touch the router, so the built-in limiter never sees
 * them. It still covers anyone hitting the endpoints directly; this covers the
 * form actions.
 *
 * Best-effort by construction: on Workers the cache lives in an isolate, and
 * there may be several. It raises the cost of using YADA as a mailbomb without
 * pretending to be a distributed rate limiter — the real ceiling is the
 * provider's daily quota.
 */
const WINDOW_MS = 60_000;

const recent = new TtlCache<number>({ ttlMs: WINDOW_MS, maxEntries: 500 });

/**
 * Claim a send slot for `key`. True means go ahead; false means one went out
 * within the window.
 *
 * Callers must answer identically either way — a throttled request that looked
 * different from a sent one would leak which addresses have accounts.
 */
export function allowSend(key: string): boolean {
  if (recent.get(key) !== null) return false;

  recent.set(key, Date.now());
  return true;
}

/** Namespaced so a reset and a verification don't throttle each other. */
export function sendKey(kind: 'verify' | 'reset', email: string) {
  return `${kind}:${email.trim().toLowerCase()}`;
}
