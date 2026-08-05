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
  ]
});
