import {
  BETTER_AUTH_API_KEY,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  DATABASE_URL,
  GOOGLE_MAPS_API_KEY,
  NODE_ENV,
  OAUTH_GOOGLE_CLIENT_ID,
  OAUTH_GOOGLE_CLIENT_SECRET,
  SOCKET_CORS_ORIGIN
} from '$env/static/private';

export const appEnv = {
  nodeEnv: NODE_ENV ?? 'development',
  databaseUrl: DATABASE_URL ?? '',
  betterAuthApiKey: BETTER_AUTH_API_KEY ?? '',
  googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
  // Better Auth
  authSecret: BETTER_AUTH_SECRET ?? '',
  authUrl: BETTER_AUTH_URL ?? 'http://localhost:5173',
  // Google OAuth (used by Better Auth's socialProviders config)
  oauthGoogleClientId: OAUTH_GOOGLE_CLIENT_ID ?? '',
  oauthGoogleClientSecret: OAUTH_GOOGLE_CLIENT_SECRET ?? '',
  // Socket.IO
  socketCorsOrigin: SOCKET_CORS_ORIGIN ?? 'http://localhost:5173'
} as const;
