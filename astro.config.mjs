// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://sebastiansamana.com',
  base: process.env.BASE_PATH || '/',
  output: 'static',
});
