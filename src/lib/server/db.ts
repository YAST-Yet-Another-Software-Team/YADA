import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { appEnv } from './env';
import * as schema from './schema';

const sql = appEnv.databaseUrl ? neon(appEnv.databaseUrl) : null;

export const db = sql ? drizzle({ client: sql, schema }) : null;
export const databasePool = sql;