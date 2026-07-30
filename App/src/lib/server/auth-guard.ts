import { redirect } from '@sveltejs/kit';

import type { AuthRole, SessionUser } from './auth';

/** A workspace is a role: every account belongs to exactly one of them. */
export type Workspace = AuthRole;

/** Where a role belongs once signed in — the single source of truth for post-auth routing. */
export function homeFor(role: AuthRole | null | undefined) {
  return role === 'courier' ? '/courier/home' : '/dashboard';
}

/**
 * Gate a route group on an authenticated user of the right workspace.
 *
 * Signed-out visitors go to the sign-in page; signed-in users in the wrong
 * workspace are sent to their own home rather than shown an error.
 */
export function requireWorkspace(user: SessionUser | null, workspace: Workspace): SessionUser {
  if (!user) {
    redirect(303, '/');
  }

  if (user.role !== workspace) {
    redirect(303, homeFor(user.role));
  }

  return user;
}
