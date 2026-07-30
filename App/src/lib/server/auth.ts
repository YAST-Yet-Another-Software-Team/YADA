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

export const auth = betterAuth({
  database: drizzleAdapter(db!, {
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
      role: {
        type: 'string',
        defaultValue: 'business',
        required: false,
        input: true
      },
      phoneNumber: {
        type: 'string',
        required: false,
        input: true
      }
    }
  },

  plugins: [dash(), sveltekitCookies(getRequestEvent)]
});

export type AuthRole = 'business' | 'courier' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  image: string | null;
}
