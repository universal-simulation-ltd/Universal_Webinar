import { execSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
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
  // ⚠️ Truncated to the same 7 characters the local fallback below produces.
  // Cloudflare hands over the FULL 40-character SHA, so the same commit used to
  // stamp two different markers depending on where it was built — and the marker
  // exists precisely to be compared against `git log` by eye.
  // Also reads GITHUB_SHA, so an Actions build stamps the commit it is
  // building rather than falling through.
  const ciSha = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA
  if (ciSha) return ciSha.slice(0, 7)

  // ⚠️ THE LOCAL-GIT FALLBACK MUST NEVER RUN IN CI. On 2026-07-26 a Pages
  // build of b4e0699 fell through to it and shipped `ac02d14` — the PREVIOUS
  // commit. The marker built to answer "is the live build current?" reported a
  // stale-looking SHA for a perfectly current deploy, and cost a later session
  // two days chasing a build that was never broken. In CI we emit 'unknown'
  // instead: a marker that is obviously useless beats one that quietly lies.
  //
  // CF_PAGES is set by Cloudflare Pages; CI by essentially every other runner.
  if (process.env.CF_PAGES || process.env.CI) {
    console.warn(
      '[build-sha] CI build with no commit SHA in the environment ' +
        '(CF_PAGES_COMMIT_SHA / GITHUB_SHA). Emitting "unknown" — the local git ' +
        "fallback reports the checkout's HEAD, which can disagree with the " +
        'commit actually being deployed.',
    )
    return 'unknown'
  }

  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}
const BUILD_SHA = resolveBuildSha()

// ── Content-Security-Policy in dev ───────────────────────────────────────────
// The production policy lives in `public/_headers` (Cloudflare Pages applies
// it), and nothing else serves it — so without this the dev server would never
// meet the policy at all. This reads the policy out of `_headers` (one source
// of truth) and serves it, Report-Only, on every page the dev server answers,
// plus what dev alone needs: Vite's inline react-refresh preamble and its HMR
// websocket. Violations are POSTed to `/__csp-report` and appended, one JSON
// line each, to $CSP_REPORT_LOG when it is set.
function cspDev(): Plugin {
  const headers = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
  const line = headers.split('\n').find((l) => /^\s*Content-Security-Policy(-Report-Only)?:/.test(l) && /default-src/.test(l))
  const policy = line ? line.slice(line.indexOf(':') + 1).trim() : ''
  const dev = policy
    // Report-Only can't carry frame-ancestors (the browser warns and ignores it).
    .replace(/;\s*frame-ancestors[^;]*/, '')
    .replace(/script-src ([^;]*)/, "script-src $1 'unsafe-inline'")
    .replace(/connect-src ([^;]*)/, 'connect-src $1 ws: wss:')
  return {
    name: 'csp-dev',
    apply: 'serve',
    configureServer(server) {
      if (!policy) return
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/__csp-report')) {
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            const log = process.env.CSP_REPORT_LOG
            if (log) appendFileSync(log, body.replace(/\n/g, ' ') + '\n')
            res.statusCode = 204
            res.end()
          })
          return
        }
        res.setHeader('Content-Security-Policy-Report-Only', `${dev}; report-uri /__csp-report`)
        next()
      })
    },
  }
}

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
      cspDev(),
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
