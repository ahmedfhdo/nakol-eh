import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative base so the build works under any GitHub Pages sub-path
  // (e.g. https://<user>.github.io/nakol-eh/) without hardcoding the repo name.
  base: './',
})
