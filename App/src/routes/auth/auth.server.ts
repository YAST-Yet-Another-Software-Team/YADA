import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { dash } from '@better-auth/infra';
import { betterAuth } from 'better-auth';
import { getOAuthState } from 'better-auth/api';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';

import type { AuthRole } from '$lib/utils/types';

import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { resetPasswordTemplate, sendEmail, verifyEmailTemplate } from '$lib/server/email';
import { runInBackground } from '$lib/server/platform';

const authUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
const trustedOrigins = [
  authUrl,
  ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
];

const AUTH_ROLES = ['business', 'courier'] as const satisfies readonly AuthRole[];

/**
 * Where a confirmation link lands once Better Auth has accepted the token.
 *
 * Relative, so it is resolved against `baseURL` and can't be broken by the
 * browser using 127.0.0.1 where BETTER_AUTH_URL says localhost. The
 * `verified=1` marker is load-bearing: Better Auth adds nothing to the URL on
 * success, so it is the only thing telling /verify-email that a confirmation
 * actually happened rather than someone typing the address.
 *
 * Sign-up and the resend action must pass the same value, which is why it
 * lives here rather than in either of them.
 */
export const VERIFY_EMAIL_CALLBACK = '/verify-email?verified=1';

/**
 * Narrow an untrusted `role` to the role union.
 *
 * Used both on the sign-up path — where the value comes straight off the
 * request body — and when reading the column back, which Better Auth types
 * loosely and the database allows to be null. A cast would let either slip
 * through and then fail every downstream role check with no explanation.
 */
export function toAuthRole(value: unknown): AuthRole {
  return AUTH_ROLES.includes(value as AuthRole) ? (value as AuthRole) : 'business';
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: authUrl,
  trustedOrigins,

  emailAndPassword: {
    enabled: true,

    resetPasswordTokenExpiresIn: 60 * 60,

    /**
     * Reset is *enabled by the presence of this function* — Better Auth throws
     * RESET_PASSWORD_DISABLED without it, which is what the "Forgot password?"
     * form used to hit on every submit.
     *
     * `url` arrives complete: Better Auth builds it from `baseURL`, which
     * already carries the /api/auth base path. It points at an interstitial
     * that validates the token and then redirects to the `redirectTo` given by
     * the caller — see the `reset` action in ./+page.server.
     */
    sendResetPassword: async ({ user, url }) => {
      const { subject, html, text } = resetPasswordTemplate({ name: user.name, url });

      await sendEmail({
        to: { email: user.email, name: user.name },
        subject,
        html,
        text
      });
    }
  },

  /**
   * Confirmation is deliberately a *soft* gate: `requireEmailVerification` is
   * not set, so sign-up still signs the account in and drops it in its
   * workspace exactly as before. An unverified account sees a banner, and is
   * refused the one action per role that matters — sending a delivery, or
   * going online. Hard-gating sign-in would strand the courier flow, which
   * signs up and redirects in one move.
   *
   * Google accounts arrive with `emailVerified` already true from the
   * provider, so none of this ever fires for them.
   */
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // A day rather than an hour: people open mail late, and a dead link is a
    // support conversation.
    expiresIn: 60 * 60 * 24,

    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html, text } = verifyEmailTemplate({ name: user.name, url });

      await sendEmail({
        to: { email: user.email, name: user.name },
        subject,
        html,
        text
      });
    }
  },

  advanced: {
    /**
     * Without this, Better Auth *awaits* the callbacks above — which would put
     * a round trip to the mail provider in front of every sign-up response.
     * `waitUntil` is how Workers is told to keep the isolate alive for work
     * that outlives the response; off Workers the promise simply floats.
     */
    backgroundTasks: {
      handler: (promise) => {
        let event = null;

        try {
          event = getRequestEvent();
        } catch {
          // Called outside a request. Nothing to defer to.
        }

        runInBackground(event, promise);
      }
    }
  },

  /**
   * The default is `NODE_ENV === "production"`, which is not reliably set
   * under workerd — so it is stated. Storage stays in memory: the database
   * backend needs a `rateLimit` model this schema does not have.
   *
   * This covers Better Auth's own HTTP endpoints only. The form actions call
   * `auth.api.*` in process and never reach the router that enforces it, which
   * is what $lib/server/email/throttle exists to cover.
   */
  rateLimit: {
    enabled: true
  },

  ...(env.OAUTH_GOOGLE_CLIENT_ID && env.OAUTH_GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: env.OAUTH_GOOGLE_CLIENT_ID,
            clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET
          }
        }
      }
    : {}),

  user: {
    additionalFields: {
      // `input: false` means Better Auth never takes `role` from a request body:
      // on sign-up it substitutes the defaultValue below (the create hook then
      // applies the requested role), and on POST /update-user it rejects the
      // request outright. Without this, any client could switch itself between
      // workspaces — or into a role that doesn't exist — through the auth API.
      role: {
        type: 'string',
        defaultValue: 'business',
        required: false,
        input: false
      },
      phoneNumber: {
        type: 'string',
        required: false,
        input: true
      }
    }
  },

  databaseHooks: {
    user: {
      create: {
        /**
         * `role` is stripped from the request body by `input: false`, so the
         * sign-up form's choice is re-applied here — clamped to a real role.
         *
         * Two paths reach this hook and they carry the role differently:
         *
         *   - email sign-up posts it in the body, which `context.body` holds;
         *   - a Google sign-up arrives on the OAuth *callback*, which is a GET.
         *     There is no body at all, so this used to clamp every social
         *     sign-up to `business` — a courier who signed up with Google was
         *     silently filed as a shop. The role instead rides in the signed
         *     `state` parameter (`additionalData` on `signInSocial`, set by the
         *     `google` action), and `getOAuthState()` reads it back here.
         *
         * A role that reaches neither is left to `toAuthRole`'s default; the
         * /welcome screen asks, because a guess is what caused the bug.
         */
        before: async (user, context) => {
          let requestedRole = (context?.body as { role?: unknown } | undefined)?.role;

          if (requestedRole === undefined) {
            // Absent outside an OAuth request, and throwing here would fail the
            // sign-up rather than the lookup.
            try {
              requestedRole = (await getOAuthState())?.role;
            } catch {
              requestedRole = undefined;
            }
          }

          return { data: { ...user, role: toAuthRole(requestedRole) } };
        }
      }
    }
  },

  plugins: [dash(), sveltekitCookies(getRequestEvent)]
});

