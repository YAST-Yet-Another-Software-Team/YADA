import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { appEnv } from './env';
import * as schema from './schema';

if (!appEnv.databaseUrl || appEnv.databaseUrl.includes('[user]') || appEnv.databaseUrl.includes('[password]')) {
	throw new Error('DATABASE_URL is not configured. Set it to your real Neon connection string before running Better Auth.');
}

const pool = new Pool({
	connectionString: appEnv.databaseUrl,
	ssl: appEnv.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});

export const db = drizzle({ client: pool, schema });
export const databasePool = pool;
