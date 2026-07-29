import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { appEnv } from './env';
import * as schema from './schema';

type GlobalDbCache = typeof globalThis & {
	__yada_db__?: {
		pool: Pool;
		db: ReturnType<typeof drizzle>;
	};
};

if (!appEnv.databaseUrl || appEnv.databaseUrl.includes('[user]') || appEnv.databaseUrl.includes('[password]')) {
	throw new Error('DATABASE_URL is not configured. Set it to your real Neon connection string before running Better Auth.');
}

const globalDb = globalThis as GlobalDbCache;

if (!globalDb.__yada_db__) {
	const pool = new Pool({
		connectionString: appEnv.databaseUrl,
		ssl: appEnv.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
		allowExitOnIdle: true,
		connectionTimeoutMillis: 10_000,
		idleTimeoutMillis: 30_000,
		max: 5
	});

	globalDb.__yada_db__ = {
		pool,
		db: drizzle({ client: pool, schema })
	};
}

export const databasePool = globalDb.__yada_db__.pool;
export const db = globalDb.__yada_db__.db;
