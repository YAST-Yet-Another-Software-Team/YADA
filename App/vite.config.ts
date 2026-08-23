import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import { socketIoDevPlugin } from './vite-plugin-socket-io';

export default defineConfig({
  plugins: [
    sveltekit(),
    // `import Helmet from '~icons/mdi/racing-helmet'` — icons compile into the
    // bundle as Svelte components, so nothing is fetched from a CDN at runtime.
    Icons({ compiler: 'svelte' }),
    socketIoDevPlugin()
  ],
  /**
   * MapLibre asks for its tile-parsing worker as a module worker, so the bundle
   * Vite emits for it has to be an ES module too — the default `iife` output
   * would be fetched with `type: 'module'` and fall over on the first split
   * chunk. MapBackdrop is the only worker in the app, so this is safe to set
   * globally.
   */
  worker: { format: 'es' },
  optimizeDeps: {
    /**
     * Pre-bundling rewrites MapLibre's `import.meta.url` to `.vite/deps/`,
     * which its worker file is never copied into — dev then served a 404 with
     * no MIME type and the browser blocked the worker, taking every map down
     * with it. Excluded so dev keeps loading it from the real dist directory.
     * The build takes the explicit URL MapBackdrop passes to `setWorkerUrl`.
     */
    exclude: ['maplibre-gl']
  }
});
