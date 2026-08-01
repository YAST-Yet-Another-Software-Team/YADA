import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

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