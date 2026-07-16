import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { appEnv } from './env';
import * as schema from './schema';

const pool = appEnv.databaseUrl
  ? new Pool({
      connectionString: appEnv.databaseUrl
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;
export const databasePool = pool;