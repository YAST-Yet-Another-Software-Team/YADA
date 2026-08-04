import cloudflare from '@sveltejs/adapter-cloudflare';
import node from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Cloudflare Workers is the deployment target — Pages is in maintenance mode,
// and the adapter reads its output paths (`main`, `assets.directory`) from
// wrangler.jsonc. `BUILD_TARGET=node npm run build` still produces the
// build/handler.js that server.js wraps, which is the only way to run the
// Socket.IO server against a production build; `npm run dev` is unaffected
// either way. See DEPLOYMENT.md.
const adapter = process.env.BUILD_TARGET === 'node' ? node() : cloudflare();

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter,
    alias: {
      // Auth lives with its route (src/routes/auth), not in $lib — the alias
      // spares consumers the ../../.. climb out of nested route groups.
      $auth: 'src/routes/auth'
    }
  }
};

export default config;
