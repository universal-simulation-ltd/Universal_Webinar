import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Universal Webinar is served at opensource.unisim.co.uk/webinar in production.
// `base` (and the PWA scope + manifest icon paths) derive from Vite's `mode`;
// local dev stays `/`. Manifest icon `src` values are RELATIVE so they resolve
// against the manifest's own URL (/webinar/manifest.webmanifest) under the base.
export default defineConfig(({ mode }) => {
  const BASE_PATH = mode === 'production' ? '/webinar/' : '/'
  return {
    base: BASE_PATH,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Universal Webinar',
          short_name: 'Webinar',
          description:
            'Host live webinars with chat, reactions, and on-demand audience speakers.',
          theme_color: '#e05504',
          background_color: '#0b0b0c',
          display: 'standalone',
          orientation: 'portrait',
          start_url: BASE_PATH,
          scope: BASE_PATH,
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: `${BASE_PATH}index.html`,
          navigateFallbackDenylist: [/^\/api/],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  }
})
