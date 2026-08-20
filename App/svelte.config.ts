import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Cloudflare Workers is the only deployment target — Pages is in maintenance
// mode, and the adapter reads its output paths (`main`, `assets.directory`)
// from wrangler.jsonc. See DEPLOYMENT.md.
//
// There is deliberately no Node build any more. `npm run dev` still runs on
// Node and still has Socket.IO attached by vite-plugin-socket-io, but that is a
// development convenience, not a shippable target: Workers has no always-on
// process for a socket server to attach to, so anything that depends on one has
// to degrade to polling in production and is therefore built to do so.
/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      // Auth lives with its route (src/routes/auth), not in $lib — the alias
      // spares consumers the ../../.. climb out of nested route groups.
      $auth: 'src/routes/auth'
    }
  }
};

export default config;
