import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import type { Handle } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// SvelteKit server hook
//
// svelteKitHandler intercepts all /api/auth/* requests and delegates them to
// Better Auth automatically (sign-in, sign-out, OAuth callback, session, etc.)
// For every other route, it resolves normally and populates event.locals with
// the current session so page/layout server loads can read it.
// The `building` flag prevents execution during `vite build`.
// ---------------------------------------------------------------------------
export const handle: Handle = async ({ event, resolve }) => {
  // Populate locals with the session on every request so any
  // +page.server.ts or +layout.server.ts can do event.locals.user.
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

