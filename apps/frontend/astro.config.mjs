// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://youthunite.online',
  integrations: [svelte(), mdx()],
  output: 'server',

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: cloudflare(),
});