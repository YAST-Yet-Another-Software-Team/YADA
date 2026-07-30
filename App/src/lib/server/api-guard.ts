import { json } from '@sveltejs/kit';

import type { AuthRole, SessionUser } from './auth';

/**
 * The error envelope every `/api` route answers with: `ok` for the happy-path
 * check, `code` for programmatic handling, `message` for display.
 */
export function apiError(status: number, code: string, message: string) {
  return json({ ok: false, code, message }, { status });
}

type Denied = { error: Response; user?: undefined };
type Allowed = { error?: undefined; user: SessionUser };

/**
 * Require a signed-in user, optionally in one of `roles`.
 *
 * Returns a discriminated union rather than throwing, so a route reads:
 *
 * ```ts
 * const guard = requireApiUser(locals, 'courier');
 * if (guard.error) return guard.error;
 * const { user } = guard;
 * ```
 *
 * Passing no roles requires only that someone is signed in.
 */
export function requireApiUser(
  locals: App.Locals,
  ...roles: AuthRole[]
): Denied | Allowed {
  const user = locals.user;

  if (!user) {
    return { error: apiError(401, 'denied', 'Sign in required.') };
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    const required = roles.map((role) => role[0].toUpperCase() + role.slice(1)).join(' or ');
    return { error: apiError(403, 'denied', `${required} account required.`) };
  }

  return { user };
}
