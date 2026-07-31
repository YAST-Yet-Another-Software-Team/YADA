/**
 * The handful of URLs that both the server guards and the client UI need to
 * agree on.
 *
 * Client-safe on purpose: `$lib/server/auth-guard` imports *from* here rather
 * than the other way round, so a page can link to the right place without
 * pulling the database into the browser bundle. Before this existed, `homeFor`
 * lived server-side and the sign-in page carried a hand-written copy with a
 * "mirrors homeFor()" comment — a comment is not a mechanism.
 */

/** The public marketing page. Where signing out lands you. */
export const LANDING_ROUTE = '/';

/** The sign-in / sign-up form. */
export const AUTH_ROUTE = '/auth';

/** Deep-link straight into a sign-up, pre-set to a role. */
export function signUpHref(role: 'business' | 'courier') {
  return `${AUTH_ROUTE}?mode=sign-up&role=${role}`;
}

/**
 * Where a role belongs once signed in — the single source of truth for
 * post-auth routing.
 *
 * Takes a loose `string` because callers hold the role at different levels of
 * narrowing (a typed `AuthRole` on the server, a possibly-null field on the
 * client) and the only distinction that matters here is courier vs everyone else.
 */
export function homeFor(role: string | null | undefined) {
  return role === 'courier' ? '/courier/home' : '/dashboard';
}
