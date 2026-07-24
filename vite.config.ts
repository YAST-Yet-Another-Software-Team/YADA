import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { socketIoDevPlugin } from './vite-plugin-socket-io';

export default defineConfig({
  plugins: [sveltekit(), socketIoDevPlugin()]
});
