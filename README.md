# Universal Webinar

> Open source — self-host free or PRO hosted by UNI SIM.

A modern, mobile-friendly webinar platform — host live Q&A with chat, reactions, and on-demand speakers.

Built as an installable PWA. One admin hosts a single live webinar. Guests join with a name and email, watch the stream, chat with emoji reactions and floating hearts, and can request to come on camera for live Q&A. The admin moderates everything: mute, kick, ban, delete messages, screen-share, lock the room with a PIN.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **PWA:** `vite-plugin-pwa` (Workbox)
- **UI:** shadcn/ui primitives + lucide-react icons
- **Routing:** React Router v6
- **Realtime + DB + Auth + Storage:** Supabase *(wires up in Phase 2)*
- **Video/audio:** LiveKit Cloud *(wires up in Phase 4)*
- **Hosting:** Cloudflare Pages, served at <https://opensource.unisim.co.uk/webinar> via the `opensource-portal` Worker

## Current status: Phase 2 — Supabase, admin auth, webinar CRUD, pre-registration

The admin can sign in, create webinars, share a pre-registration link, and see registrations roll in. See [SUPABASE.md](SUPABASE.md) for one-time backend setup (~10 minutes, no card).

| Route | Page |
| --- | --- |
| `/` | Landing |
| `/w/:slug/register` | Pre-registration (name + email) |
| `/w/:slug` | Guest join (name + email at the door) |
| `/w/:slug/live` | Guest live room (video + chat — Phases 3–4) |
| `/admin/login` | Admin sign-in (Supabase Auth) |
| `/admin` | Admin dashboard — list + create webinars |
| `/admin/w/:slug` | Admin control room (settings, registrations, live controls) |
| `/admin/settings` | Admin account |

## Local development

Requires **Node 20+**.

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys, see SUPABASE.md
npm run dev
```

Open <http://localhost:5173>.

To install on iOS Safari or Android Chrome: open the deployed URL, tap *Share → Add to Home Screen*.

## Build

```bash
npm run typecheck   # tsc --noEmit
npm run build       # produces dist/
npm run preview     # serve the production build locally
```

## Deploy

The hosted instance lives at <https://opensource.unisim.co.uk/webinar> — a Cloudflare Pages project served by path via the `opensource-portal` Worker, which proxies `/webinar/*` to the Pages deployment. Production builds use `base: '/webinar/'` (see [`vite.config.ts`](vite.config.ts)); local dev stays at `/`.

To self-host a fork, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PLATFORM_SUPABASE_URL`, `VITE_PLATFORM_SUPABASE_ANON_KEY`, then run `npm run build`. The static `dist/` output is portable — host it on any static host (Cloudflare Pages, Vercel, Netlify, the user's shared hosting via FTP, etc.). If you serve it from the domain root rather than under `/webinar/`, build with the base path overridden accordingly.

## Roadmap

This is built in phases. Each phase ends with a verification checkpoint before the next begins.

- **Phase 1** — Branded PWA shell ✅
- **Phase 2** — Supabase + admin auth + webinar CRUD + pre-registration *(current)*
- **Phase 3** — Guest join + realtime chat + reactions
- **Phase 4** — LiveKit video (admin broadcasts)
- **Phase 5** — Speaker requests + admin moderation
- **Phase 6** — PIN lock + screen-share polish
- **Phase 7** — Recording (LiveKit Egress)
- **Phase 8** — PWA polish, mobile QA, custom domain

## Project structure

```
src/
  components/
    ui/                shadcn primitives (Button, Input, Card, Dialog, Label)
    Layout.tsx         Public + admin layouts
    Logo.tsx           Brand mark
    NewWebinarDialog.tsx
    ProtectedRoute.tsx
  lib/
    auth.tsx           Auth provider + useAuth hook (Supabase)
    brand.ts           Color tokens
    database.types.ts  Typed table rows / inserts
    db.ts              Webinar + registration data access
    slug.ts            URL-safe slug generation
    supabase.ts        Browser Supabase client
    utils.ts           cn() helper
  pages/
    Landing.tsx
    Join.tsx            Join with name + email (at door)
    Register.tsx        Pre-registration
    Live.tsx            (stubbed — Phase 3)
    NotFound.tsx
    admin/
      Login.tsx
      Dashboard.tsx     Lists webinars + opens NewWebinarDialog
      Control.tsx       Live controls, settings toggles, registrations list
      Settings.tsx
  index.css
  App.tsx
  main.tsx
supabase/
  migrations/
    0001_init.sql       Tables, RLS, realtime publication
public/
  favicon.svg
  apple-touch-icon.png
  icons/                PWA icons (192, 512, maskable)
```

## License

MIT
