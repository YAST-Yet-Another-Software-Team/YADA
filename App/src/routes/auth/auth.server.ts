import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { dash } from '@better-auth/infra';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';

import type { AuthRole } from '$lib/utils/types';

import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

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
        // `role` is stripped from the request body by `input: false`, so the
        // sign-up form's choice is re-applied here — clamped to a real role.
        // Social sign-ups carry no role and default to business.
        before: async (user, context) => {
          const requestedRole = (context?.body as { role?: unknown } | undefined)?.role;

          return { data: { ...user, role: toAuthRole(requestedRole) } };
        }
      }
    }
  },

  plugins: [dash(), sveltekitCookies(getRequestEvent)]
});

