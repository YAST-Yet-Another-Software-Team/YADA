import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

const AUTH_BASE = '/api/auth';

function isAuthRequest(pathname: string) {
  return pathname === AUTH_BASE || pathname.startsWith(`${AUTH_BASE}/`);
}

// ---------------------------------------------------------------------------
// SvelteKit server hook
//
// Better Auth's svelteKitHandler matches on origin+path; that 404s when the
// browser uses 127.0.0.1 while BETTER_AUTH_URL is localhost (or vice versa).
// We short-circuit /api/auth/* by pathname first, then fall through to
// svelteKitHandler / resolve for everything else.
// ---------------------------------------------------------------------------
export const handle: Handle = async ({ event, resolve }) => {
  if (!building && isAuthRequest(event.url.pathname)) {
    return auth.handler(event.request);
  }

  const session = await auth.api.getSession({ headers: event.request.headers });

  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email ?? null,
        phone: (session.user as Record<string, unknown>).phoneNumber as string | null,
        role: ((session.user as Record<string, unknown>).role as string | null) as
          | 'business'
          | 'courier'
          | 'admin',
        image: session.user.image ?? null
      }
    : null;

  return svelteKitHandler({ event, resolve, auth, building });
};
