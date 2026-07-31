import { redirect } from '@sveltejs/kit';

import { AUTH_ROUTE, homeFor } from '$lib/shared/routes';

import type { AuthRole, SessionUser } from './auth';

/** A workspace is a role: every account belongs to exactly one of them. */
export type Workspace = AuthRole;

// Re-exported so server code has one import for "where do I send this user",
// while the definitions stay in a module the browser can also import.
export { homeFor };

/**
 * Gate a route group on an authenticated user of the right workspace.
 *
 * Signed-out visitors go to the sign-in page; signed-in users in the wrong
 * workspace are sent to their own home rather than shown an error.
 */
export function requireWorkspace(user: SessionUser | null, workspace: Workspace): SessionUser {
  if (!user) {
    redirect(303, AUTH_ROUTE);
  }

  if (user.role !== workspace) {
    redirect(303, homeFor(user.role));
  }

  return user;
}
