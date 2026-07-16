import { env } from 'node:process';

export const appEnv = {
  nodeEnv: env.NODE_ENV ?? 'development',
  databaseUrl: env.DATABASE_URL ?? '',
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY ?? '',
  authSecret: env.BETTER_AUTH_SECRET ?? '',
  authUrl: env.BETTER_AUTH_URL ?? 'http://localhost:5173',
  oauthGoogleClientId: env.OAUTH_GOOGLE_CLIENT_ID ?? '',
  oauthGoogleClientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET ?? '',
  socketCorsOrigin: env.SOCKET_CORS_ORIGIN ?? 'http://localhost:5173'
} as const;