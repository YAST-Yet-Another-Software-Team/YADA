import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    // The Cloudflare build alone takes about 90 seconds, so the 60-second
    // default expired before the preview server ever came up and every run
    // failed with "Timed out waiting from config.webServer" — whatever the
    // tests said.
    timeout: 240_000,
  },
  testMatch: "**/*.e2e.{ts,js}",
});
