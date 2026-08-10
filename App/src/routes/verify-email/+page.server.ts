import { fail } from '@sveltejs/kit';

import { auth, VERIFY_EMAIL_CALLBACK } from '$auth/auth.server';
import { authErrorMessage } from '$auth/errors';
import { messageForApiError } from '$lib/server/auth-error';
import { allowSend, sendKey } from '$lib/server/email/throttle';

import type { Actions } from './$types';

/**
 * Three ways to arrive:
 *
 *   ?verified=1            Better Auth accepted the token and redirected here.
 *   ?verified=1&error=…    It rejected the token — expired, or already spent.
 *   (nothing)              Someone followed the banner, or typed the address.
 *
 * Better Auth adds nothing on success, which is why sign-up puts `verified=1`
 * in the callback: without a marker of our own there is no way to tell a
 * genuine confirmation from a bare visit.
 */
export function load({ url, locals }) {
  const error = url.searchParams.get('error');
  const claimed = url.searchParams.get('verified') === '1';

  const state = error ? 'failed' : claimed ? 'success' : 'pending';

  return {
    state,
    message: error ? authErrorMessage(error, null, 'That confirmation link is invalid.') : null,
    email: locals.user?.email ?? null,
    // Read fresh from the session rather than trusted from the query: a link
    // clicked twice comes back as a plain success, and this is what lets the
    // page say "already confirmed" instead of implying it just happened.
    verified: locals.user?.emailVerified === true,
    signedIn: Boolean(locals.user),
    // Decides which workspace the "Continue" button goes back to.
    role: locals.user?.role ?? null
  };
}

export const actions = {
  /**
   * Send another confirmation link.
   *
   * Reachable from the banner in either workspace and from this page. Requires
   * a session — the address comes from it, never from the form, or this would
   * be an open relay pointed at any inbox someone cared to name.
   */
  resend: async ({ request, locals }) => {
    const email = locals.user?.email;

    if (!email) {
      return fail(401, { message: 'Sign in first, then ask for a new link.' });
    }

    if (locals.user?.emailVerified) {
      return { sent: false, message: "That email is already confirmed. You're all set." };
    }

    // One per address per minute — Better Auth's own limiter guards its HTTP
    // endpoint, but this calls `auth.api.*` in process and never reaches it.
    // A throttled request returns the same thing a sent one does.
    if (allowSend(sendKey('verify', email))) {
      try {
        await auth.api.sendVerificationEmail({
          body: { email, callbackURL: VERIFY_EMAIL_CALLBACK },
          headers: request.headers
        });
      } catch (error) {
        const message = messageForApiError(error, 'Unable to send a new link.');
        if (message === null) throw error;

        return fail(400, { message });
      }
    }

    return { sent: true };
  }
} satisfies Actions;
