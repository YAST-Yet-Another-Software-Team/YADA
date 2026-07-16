import { defineConfig } from 'drizzle-kit';
import { env } from 'node:process';

export default defineConfig({
  schema: './src/lib/server/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL ?? ''
  },
  verbose: true,
  strict: true
});