import { auth, toAuthRole } from '$lib/server/auth';
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

const AUTH_BASE = '/api/auth';

function isAuthRequest(pathname: string) {
  return pathname === AUTH_BASE || pathname.startsWith(`${AUTH_BASE}/`);
}

// ---------------------------------------------------------------------------
// SvelteKit server hook
//
// This is the only mount of the Better Auth handler. It matches on pathname
// alone, unlike better-auth's own svelteKitHandler, which compares origin+path
// against BETTER_AUTH_URL and 404s when the browser uses 127.0.0.1 while that
// is set to localhost (or vice versa). Because this returns a Response before
// routing, there is deliberately no /api/auth/[...all] route to back it up —
// such a route could never be reached.
// ---------------------------------------------------------------------------
export const handle: Handle = async ({ event, resolve }) => {
  if (!building && isAuthRequest(event.url.pathname)) {
    return auth.handler(event.request);
  }

  try {
    const session = await auth.api.getSession({ headers: event.request.headers });

    if (session?.user) {
      // phoneNumber and role arrive as additionalFields, which aren't in the
      // base user type — read them off the record and narrow explicitly.
      const fields = session.user as Record<string, unknown>;

      event.locals.session = session.session;
      event.locals.user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email ?? null,
        phone: typeof fields.phoneNumber === 'string' ? fields.phoneNumber : null,
        role: toAuthRole(fields.role),
        image: session.user.image ?? null
      };
    } else {
      event.locals.session = null;
      event.locals.user = null;
    }
  } catch {
    event.locals.session = null;
    event.locals.user = null;
  }

  return resolve(event);
};
