import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const env = process.env;

export const appEnv = {
  nodeEnv: env.NODE_ENV ?? 'development',
  databaseUrl: env.DATABASE_URL ?? '',
  betterAuthApiKey: env.BETTER_AUTH_API_KEY ?? '',
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY ?? '',
  authSecret: env.BETTER_AUTH_SECRET ?? '',
  authUrl: env.BETTER_AUTH_URL ?? 'http://localhost:5173',
  oauthGoogleClientId: env.OAUTH_GOOGLE_CLIENT_ID ?? '',
  oauthGoogleClientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET ?? '',
  socketCorsOrigin: env.SOCKET_CORS_ORIGIN ?? 'http://localhost:5173',
  /** Extra comma-separated origins, e.g. http://172.20.10.3:5173 */
  trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
} as const;
