import { sveltekit } from "@sveltejs/kit/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import { socketIoDevPlugin } from "./vite-plugin-socket-io";

export default defineConfig({
  plugins: [
    sveltekit(),
    // `import Helmet from '~icons/mdi/racing-helmet'` — icons compile into the
    // bundle as Svelte components, so nothing is fetched from a CDN at runtime.
    Icons({ compiler: "svelte" }),
    socketIoDevPlugin(),
  ],
  /**
   * Unit tests. Node environment because everything under test is pure logic —
   * the dispatch clock, the trip state machine, the matching maths, geo and
   * validation. Component and journey coverage is Playwright's job, and its
   * `*.e2e.ts` files are matched by a different runner so the two never collide.
   */
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    /**
     * `$lib/server/db` throws at import time when DATABASE_URL is absent, and
     * `data/matching.ts` holds pure scoring functions beside its one query. No
     * unit test opens a connection — `createConnection()` is lazy — so a
     * syntactically valid dummy is all that import needs to succeed.
     *
     * Deliberately not the real credential: nothing here should be able to
     * reach a live database by accident.
     */
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
