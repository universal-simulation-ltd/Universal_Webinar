// Supabase Edge Function — webinar-time-limit
// Closes the LiveKit rooms of FREE webinars that have run past their time cap.
//
// Called only by pg_cron's `webinar-free-time-limit` job (universal-platform
// migration 0202), and only when public.webinar_end_free_overruns() has just
// marked at least one free webinar as ended. That SQL is the first half of the
// stop — the apps react to status 'ended' — and deleting the room here is the
// hard half: LiveKit refreshes the tokens of anyone already connected, so no
// longer issuing tokens (livekit-token) cannot end a webinar on its own.
//
// Why a cap at all: we stay on LiveKit Cloud's free Build plan, 5,000
// participant-minutes a month for the whole suite, and a free webinar is up to
// 25 people × 90 minutes (James, 2026-09-30).
//
// Auth: the shared CRON_SECRET in `x-cron-secret`. Deploy with --no-verify-jwt.
// Secrets: CRON_SECRET, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.

import { livekitHttpUrl, signAdminToken } from '../_shared/livekitAdmin.ts'

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('Forbidden', { status: 403 })
  }

  const apiKey = Deno.env.get('LIVEKIT_API_KEY')
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
  const base = livekitHttpUrl()
  if (!apiKey || !apiSecret || !base) {
    return json({ error: 'LiveKit not configured' }, 503)
  }

  let rooms: string[] = []
  try {
    const body = await req.json() as { rooms?: unknown }
    if (Array.isArray(body.rooms)) {
      rooms = body.rooms.filter((r): r is string => typeof r === 'string' && r.startsWith('webinar-'))
    }
  } catch { /* empty body */ }

  const results: Record<string, string> = {}
  for (const room of rooms) {
    const token = await signAdminToken(apiKey, apiSecret, { roomCreate: true, room })
    const res = await fetch(`${base}/twirp/livekit.RoomService/DeleteRoom`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ room }),
    })
    // A room nobody joined doesn't exist on LiveKit's side — that's fine.
    results[room] = res.ok ? 'deleted' : `status ${res.status}`
    if (!res.ok && res.status !== 404) {
      console.error('webinar-time-limit: DeleteRoom failed', room, res.status, await res.text())
    }
  }

  return json({ ok: true, results })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
