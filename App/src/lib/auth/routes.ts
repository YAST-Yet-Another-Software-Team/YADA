/**
 * The two URLs that the server guards and the client UI must agree on.
 *
 * Deliberately small — anything used by only one file belongs in that file, not
 * here. What's left has more than one caller, and they straddle the server/client
 * line:
 *
 * - `AUTH_ROUTE`  — `auth-guard.requireWorkspace` (server) and the landing page
 *                   header, hero and footer (browser).
 * - `homeFor`     — `auth-guard.requireWorkspace` (server, gating every business
 *                   and courier route), `auth/+page.server.ts` (server), the
 *                   landing page CTA and both post-auth redirects on the sign-in
 *                   form (browser).
 *
 * Client-safe on purpose: `$lib/server/auth-guard` imports *from* here rather
 * than the other way round, so a page can link to the right place without
 * pulling the database into the browser bundle. Before this existed, `homeFor`
 * lived server-side and the sign-in page carried a hand-written copy with a
 * "mirrors homeFor()" comment — a comment is not a mechanism.
 *
 * It cannot live in `routes/auth/+page.server.ts`, which would otherwise be the
 * natural home. SvelteKit rejects that twice over: `+page.server.ts` may only
 * export `load`/`actions`/`prerender`/`csr`/`ssr`/`trailingSlash`/`config`/
 * `entries` (anything else fails the build with "Invalid export"), and even an
 * `_`-prefixed export can't be imported by `+page.svelte` — the guard plugin
 * refuses to load a server module "into code that runs in the browser".
 */

/** The sign-in / sign-up form. `/` is the public landing page, not the form. */
export const AUTH_ROUTE = '/auth';

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
