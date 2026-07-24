import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Universal Webinar is served under /webinar/ via the opensource-portal worker
// (opensource.unisim.co.uk/webinar). Local dev stays at root so hot-reload
// works without the prefix.
// Build-version marker: prefer the Cloudflare Pages commit SHA baked in at build
// time, fall back to the local git short SHA, then 'dev'. Surfaced as a
// <meta name="build-sha"> tag and a startup console.log so the live build is
// identifiable in-browser without wrangler.
function resolveBuildSha(): string {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}
const BUILD_SHA = resolveBuildSha()

export default defineConfig(({ mode }) => {
  const BASE_PATH = mode === 'production' ? '/webinar/' : '/'
  return {
    base: BASE_PATH,
    define: {
      'import.meta.env.VITE_BUILD_SHA': JSON.stringify(BUILD_SHA),
    },
    plugins: [
      {
        name: 'build-sha-meta',
        transformIndexHtml() {
          return [
            { tag: 'meta', attrs: { name: 'build-sha', content: BUILD_SHA }, injectTo: 'head' as const },
          ]
        },
      },
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.png',
          'icon-180.png',
          'icon-192.png',
          'icon-512.png',
        ],
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
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon-512.png',
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
