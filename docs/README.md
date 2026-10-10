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

## Recording

**Record this webinar** (the host's stage) records the session **in the host's
own browser** — free, and nothing is uploaded. `src/lib/sessionRecorder.ts`
draws the stage onto a canvas (the screen share full-frame with the speaker's
camera as a bubble, otherwise the active speaker's camera), mixes every
microphone in the room through Web Audio, and encodes it with MediaRecorder.
Frames are driven by a worker timer, so the recording keeps moving while the
host is in another tab presenting. Chrome and Edge stream the file to disk as
it records (File System Access API); other browsers download it at the end.
The file is WebM where the browser can make it (Chrome's MP4 recorder holds
everything in memory until it stops), with its length written in afterwards
(`src/lib/webmDuration.ts`) so it can be seeked.

When the host presses **Stop**, the take is offered right there: **Download**
(unless it was already streamed to a file they picked) and **Upload as
replay**. Leaving the stage under a running recording still saves it at once.

*Why a canvas mix and not tab capture* (re-checked 2026-10-10):
`getDisplayMedia` with `preferCurrentTab` is Chromium-only — Safari can share
only a screen or window, with no tab audio — and every browser makes the host
pick from a prompt, records whatever else is on screen, and leaves out the
host's own microphone (a tab never plays itself back). The canvas + Web Audio
mix needs no prompt and records exactly the stage guests see, in Chrome, Edge
and Safari.

**Consent.** While a recording runs, the host's LiveKit participant carries a
`recording` attribute (only the host's token may set its own attributes), and
every participant sees a **Recording** badge and notice (`RecordingBadge.tsx`).
Cloud recordings set LiveKit's own `room.isRecording`, which shows the same
badge. The join and registration pages say sessions may be recorded.

**Replays and the follow-up email.** On the wrap-up page the host can upload
the recording (or any MP4/WebM) as the replay. It is stored as an ordinary
hosted upload (product `recorder`, so it also appears in their Universal
Recorder) and uses the company's online file storage allowance — the shared
files pool, then a token. Up to 50 MB goes up in one PUT; bigger replays, up
to **2 GB** (about four hours at the recorder's ~500 MB an hour), go up in
16 MB parts (`src/lib/multipartUpload.ts`, R2 multipart through the platform's
`hosted-files` function and Worker, which enforce the 2 GB and the size the
upload was charged for). A dropped connection pauses the upload with every
finished part kept, and **Resume upload** carries on from there. The link `/replay/<id>` is written to
`recording_url`, which the follow-up email already carries. The replay page
asks the platform's `webinar-recording` function for a short-lived video URL;
the id in the link is the only credential (a slug would let anyone find any
webinar's replay).

**Cloud recording** (LiveKit Egress, written straight to R2) is built but
**off**: the `webinar-recording` function refuses to start one unless the
server flag is on, R2 credentials are set, and the webinar is a paid one. The
host's Record-in-the-cloud button only appears once the server says it is on.

## Creating a webinar

Webinars are created only through the platform's `create_webinar()` RPC
(universal-platform 0263), never by inserting into `webinars`: the server mints
the manage token, sets the host to the caller's own verified address, and in
the same transaction takes the free token hold or counts the company-less
Universal ID's one webinar (0221) — or refuses and creates nothing. A
self-hosted database without that function falls back to the old direct
insert (`createWebinar` in `src/lib/db.ts`).

## Suite context

This repo is one part of the **Universal Simulation suite** (the open-source
Universal Apps family). For cross-repo context — how the `@unisim/sdk`, edge
routing, and the suite changelog wire together — see the suite docs repo:
[`universal-simulation-ltd/docs`](https://github.com/universal-simulation-ltd/docs)
(private; checked out at the umbrella root as `Docs_UNI_SIM/` for suite
contributors). Start with `ARCHITECTURE.md` (the cross-repo map).
