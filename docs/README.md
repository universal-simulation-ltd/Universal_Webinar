# Universal Webinar — docs

## What this repo is

Universal Webinar is a modern, mobile-friendly **webinar platform** — one
admin hosts a live webinar; guests join with a name and email, watch the
stream, chat with emoji reactions and floating hearts, and can request to come
on camera for live Q&A. The admin moderates everything: mute, kick, ban,
delete messages, screen-share, and lock the room with a PIN. Pre-registration
links let registrations roll in before the event.

- **Live:** [opensource.unisim.co.uk/webinar](https://opensource.unisim.co.uk/webinar)
  — served by path via the `opensource-portal` Worker, which proxies
  `/webinar` to its Cloudflare Pages project.
- **Stack:** Vite + React 18 + TypeScript + Tailwind, shadcn/ui primitives,
  React Router v6, installable PWA (`vite-plugin-pwa`).
- **Backend:** Supabase for realtime chat, DB, admin auth and storage (see
  `SUPABASE.md` in the repo root for the one-time setup), and **LiveKit
  Cloud** for video/audio — including the speaker queue that brings guests on
  camera.

Free and open source — self-host with your own Supabase/LiveKit, or use the
hosted deployment above.

## Suite context

This repo is one part of the **Universal Simulation suite** (the open-source
Universal Apps family). For cross-repo context — how the `@unisim/sdk`, edge
routing, and the suite changelog wire together — see the suite docs repo:
[`universal-simulation-ltd/docs`](https://github.com/universal-simulation-ltd/docs)
(private; checked out at the umbrella root as `Docs_UNI_SIM/` for suite
contributors). Start with `ARCHITECTURE.md` (the cross-repo map).
