import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { appEnv } from './env';
import * as schema from './schema';

// ---------------------------------------------------------------------------
// Lazy database connection — do not throw at import time so the frontend can
// run without a database. Call getDb() only in server routes that need it.
// ---------------------------------------------------------------------------

let _sql: ReturnType<typeof neon> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function hasValidUrl(): boolean {
	return (
		!!appEnv.databaseUrl &&
		!appEnv.databaseUrl.includes('[user]') &&
		!appEnv.databaseUrl.includes('[password]')
	);
}

/** Get the neon SQL client, or null if not configured. */
export function getSql() {
	if (!_sql && hasValidUrl()) {
		_sql = neon(appEnv.databaseUrl);
	}
	return _sql;
}

/** Get the Drizzle ORM instance, or null if not configured. */
export function getDb() {
	if (!_db && hasValidUrl()) {
		const sql = getSql();
		if (sql) {
			_db = drizzle({ client: sql, schema });
		}
	}
	return _db;
}

// Re-export for backward compatibility with existing imports that expect db/databasePool
export const db = null as ReturnType<typeof drizzle> | null;
export const databasePool = null as ReturnType<typeof neon> | null;