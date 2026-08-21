import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { env } from "node:process";

dotenv.config();

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
