import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { dash } from '@better-auth/infra';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';

import { db } from './db';
import * as schema from './schema';

const authUrl = env.BETTER_AUTH_URL ?? 'http://localhost:5173';
const trustedOriginsExtra = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function isPrivateLanOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  } catch {
    return false;
  }
}

async function resolveTrustedOrigins(request?: Request) {
  const origins = [
    authUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Host wildcards (Better Auth matches against hostname)
    '172.*.*.*:5173',
    '192.168.*.*:5173',
    '10.*.*.*:5173',
    '172.*.*.*:3000',
    '192.168.*.*:3000',
    '10.*.*.*:3000',
    ...trustedOriginsExtra
  ];

  // Always accept the live browser Origin on private LAN in development
  // (covers phone hotspot IPs like http://172.20.10.3:5173).
  if ((env.NODE_ENV ?? 'development') !== 'production' && request) {
    const header = request.headers.get('origin') ?? request.headers.get('referer');
    if (header) {
      try {
        const origin = new URL(header).origin;
        if (isPrivateLanOrigin(origin)) {
          origins.push(origin);
        }
      } catch {
        // ignore
      }
    }
  }

  return [...new Set(origins.filter(Boolean))];
}

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
  // Function form so each request can include its LAN Origin (hotspot/phone testing)
  trustedOrigins: resolveTrustedOrigins,

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
