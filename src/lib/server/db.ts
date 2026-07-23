import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { appEnv } from './env';
import * as schema from './schema';

if (!appEnv.databaseUrl || appEnv.databaseUrl.includes('[user]') || appEnv.databaseUrl.includes('[password]')) {
	throw new Error('DATABASE_URL is not configured. Set it to your real Neon connection string before running Better Auth.');
}

const sql = neon(appEnv.databaseUrl);

export const db = sql ? drizzle({ client: sql, schema }) : null;
export const databasePool = sql;
