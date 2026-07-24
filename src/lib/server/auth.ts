import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { dash } from '@better-auth/infra';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';

import { db } from './db';
import { appEnv } from './env';
import * as schema from './schema';

// ---------------------------------------------------------------------------
// Better Auth instance
//
// - drizzleAdapter maps our custom table names / field names to BA's models.
// - generateId: false — let PostgreSQL produce UUIDs via defaultRandom().
// - Google OAuth provider is declared here; fill in credentials via .env.
// - role + phoneNumber live on the users table as additionalFields so BA
//   reads/writes them alongside its own fields.
// - sveltekitCookies plugin ensures Set-Cookie works inside SvelteKit's
//   server actions (which bypass the normal response cycle).
// ---------------------------------------------------------------------------
export const auth = betterAuth({
  // Require DATABASE_URL to be set; db can be null during type-check without a DB
  database: drizzleAdapter(db!, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),

  secret: appEnv.authSecret,
  baseURL: appEnv.authUrl,
  trustedOrigins: [
    appEnv.authUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],

  emailAndPassword: {
    enabled: true
  },

  ...(appEnv.oauthGoogleClientId && appEnv.oauthGoogleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: appEnv.oauthGoogleClientId,
            clientSecret: appEnv.oauthGoogleClientSecret
          }
        }
      }
    : {}),

  user: {
    // Map BA's default 'image' field to our column name is already handled
    // by the schema rename. Declare extra YADA columns as additionalFields.
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

  // sveltekitCookies must be last — it finalises Set-Cookie during server actions.
  plugins: [dash(), sveltekitCookies(getRequestEvent)]
});

// ---------------------------------------------------------------------------
// Re-export the session user shape so the rest of the app can reference it.
// ---------------------------------------------------------------------------
export type AuthRole = 'business' | 'courier' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  image: string | null;
}
