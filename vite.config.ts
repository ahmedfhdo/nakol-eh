import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      // 'prompt': a new version waits until the user taps "Reload" instead of
      // swapping code under them mid-use (see src/lib/pwa.svelte.ts).
      registerType: 'prompt',
      // We call registerSW() ourselves from main.ts.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Nakol Eh — ناكل ايه',
        short_name: 'Nakol Eh',
        description: 'Pick a random dinner from what you have at home.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7ebd3',
        theme_color: '#1d3a8a',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell (it's ~150 kB): after the first visit the app
        // loads with no network at all. Data lives in IndexedDB, which is offline anyway.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Hash routing means every screen is index.html, so this is the only navigation route.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Google Fonts live on another origin, so they can't be precached. Cache them
        // at runtime instead: the stylesheet is refreshed in the background, the font
        // files (immutable, versioned URLs) are served from cache for a year.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Relative base so the build works under any GitHub Pages sub-path
  // (e.g. https://<user>.github.io/nakol-eh/) without hardcoding the repo name.
  base: './',
})
