import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

// SvelteKit loads .env for the app under test; the runner is a separate process
// and gets nothing. The journey needs DATABASE_URL out here too, to verify
// stored state and to clean up after itself.
dotenv.config();

/**
 * Two kinds of end-to-end test, kept apart on purpose.
 *
 * `guards` needs no session and writes nothing. It is the suite that can always
 * be run, anywhere, against anything.
 *
 * `journey` drives the whole two-actor delivery — it creates accounts, raises
 * trips and writes positions, so it is **destructive** and is skipped unless
 * `E2E_ALLOW_DESTRUCTIVE=1` is set. Point `DATABASE_URL` at a throwaway Neon
 * branch before setting it; never at the database the app is deployed against.
 *
 *   DATABASE_URL=<neon test branch> E2E_ALLOW_DESTRUCTIVE=1 npm run test:e2e
 */
const destructive = process.env.E2E_ALLOW_DESTRUCTIVE === "1";

export default defineConfig({
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    // The Cloudflare build alone takes about 90 seconds, so the 60-second
    // default expired before the preview server ever came up and every run
    // failed with "Timed out waiting from config.webServer" — whatever the
    // tests said.
    timeout: 240_000,
  },

  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    // Pinned so the responsive split is deterministic: the business screens
    // render a card list below Tailwind's `lg` (1024px) and a table above it,
    // and both carry the same text.
    viewport: { width: 1280, height: 800 },
  },

  // The journey is a sequence of states in one database; running its steps in
  // parallel would have them racing each other rather than the dispatcher.
  workers: destructive ? 1 : undefined,

  projects: [
    {
      name: "guards",
      testMatch: ["src/**/*.e2e.ts"],
    },

    ...(destructive
      ? [
          {
            name: "setup",
            testMatch: ["e2e/setup.e2e.ts"],
            teardown: "teardown",
          },
          {
            name: "journey",
            testMatch: ["e2e/journey.e2e.ts"],
            dependencies: ["setup"],
          },
          {
            name: "teardown",
            testMatch: ["e2e/teardown.e2e.ts"],
          },
        ]
      : []),
  ],
});
