import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { dash } from '@better-auth/infra';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';

import { db } from './db';
import * as schema from './db/schema';

const authUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
const trustedOrigins = [
  authUrl,
  ...(env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
];

/**
 * Roles a user may pick for themselves at sign-up. `admin` is deliberately absent —
 * it can only be granted out of band, never through the auth API.
 */
const SELF_ASSIGNABLE_ROLES = ['business', 'courier'] as const;

function normalizeSignUpRole(role: unknown) {
  return SELF_ASSIGNABLE_ROLES.includes(role as (typeof SELF_ASSIGNABLE_ROLES)[number])
    ? (role as (typeof SELF_ASSIGNABLE_ROLES)[number])
    : 'business';
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
      // request outright. Without this, any client could sign up — or promote
      // itself — as `admin`.
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
        // sign-up form's choice is re-applied here — clamped to a role a user is
        // allowed to give themselves. Social sign-ups carry no role and default
        // to business.
        before: async (user, context) => {
          const requestedRole = (context?.body as { role?: unknown } | undefined)?.role;

          return { data: { ...user, role: normalizeSignUpRole(requestedRole) } };
        }
      }
    }
  },

  plugins: [dash(), sveltekitCookies(getRequestEvent)]
});

export type AuthRole = 'business' | 'courier' | 'admin';

const AUTH_ROLES: readonly AuthRole[] = ['business', 'courier', 'admin'];

/**
 * Narrow the `role` column to the role union.
 *
 * Better Auth types additionalFields loosely and the column is nullable, so a
 * plain cast lets `null` masquerade as a valid role — it then fails every
 * `role !== 'courier' && role !== 'admin'` guard and 403s with no explanation.
 * Anything unrecognised falls back to the column's own defaultValue. The one
 * guarantee that matters: this never returns `admin` for a value that wasn't.
 */
export function toAuthRole(value: unknown): AuthRole {
  return AUTH_ROLES.includes(value as AuthRole) ? (value as AuthRole) : 'business';
}

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  image: string | null;
}
