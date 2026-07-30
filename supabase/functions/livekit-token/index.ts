// Supabase Edge Function — livekit-token
// Generates a signed LiveKit access token.
//
// Required env vars in Supabase Dashboard → Settings → Edge Functions:
//   LIVEKIT_API_KEY     — from your LiveKit Cloud project
//   LIVEKIT_API_SECRET  — from your LiveKit Cloud project
//   LIVEKIT_URL         — returned to the client, which doesn't hardcode it
//
// Called from the frontend via supabase.functions.invoke('livekit-token', { body: { ... } }).
//
// ── 2026-07-30: hosts can finally get a host token ──────────────────────────
// This function was written before the multi-host pivot and still said:
//
//     if (role === 'host' && callerEmail !== 'accounts@unisim.co.uk') → 403
//
// i.e. on a product where anyone can create a webinar, the only person who
// could ever broadcast was the platform admin. That is why "Your stage" has
// been a placeholder — not a missing integration, an authorisation rule left
// behind by a pivot.
//
// A host now proves themselves with their `manage_token`, the same credential
// every other host action uses (0003 / 0062 / 0067 / webinar-doc). That path
// deliberately does NOT require an auth session: `host_verified` is a column
// that stays true forever while a session expires, and a host who joined their
// own room as a guest holds an *anonymous* session with no email claim. Both
// look signed-in and neither can prove ownership. See the webinar-doc README
// for the same lesson learned the hard way.
//
// Speaker and viewer tokens are unchanged and still require a real session.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const apiKey = Deno.env.get('LIVEKIT_API_KEY')
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
    const livekitUrl = Deno.env.get('LIVEKIT_URL') ?? Deno.env.get('VITE_LIVEKIT_URL') ?? ''

    if (!apiKey || !apiSecret) {
      return json({ error: 'LiveKit not configured' }, 503)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseKey)

    const { webinar_id, attendee_id, role, manage_token } = await req.json() as {
      webinar_id: string
      attendee_id: string | null
      role: 'host' | 'speaker' | 'viewer'
      manage_token?: string | null
    }

    if (!webinar_id) return json({ error: 'webinar_id required' }, 400)

    // Verify the webinar exists.
    const { data: webinar } = await adminClient
      .from('webinars')
      .select('id, slug, manage_token')
      .eq('id', webinar_id)
      .single()

    if (!webinar) return json({ error: 'Webinar not found' }, 404)

    // ── Who is asking ────────────────────────────────────────────────────────
    // The manage token stands on its own: it is the host credential, and a
    // host legitimately may have no auth session at all. Compared here rather
    // than in a `.eq()` so an absent token can never match an absent column.
    const isOwner =
      typeof manage_token === 'string' &&
      manage_token.length > 0 &&
      manage_token === webinar.manage_token

    // A session is still read, because speaker and viewer need one — but its
    // absence is only fatal for those roles.
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user } } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    const isAdmin = user?.email?.toLowerCase() === 'accounts@unisim.co.uk'

    if (role === 'host') {
      if (!isOwner && !isAdmin) {
        return json({ error: 'Only this webinar’s host may broadcast' }, 403)
      }
    } else {
      if (!user) return json({ error: 'Unauthorized' }, 401)
      if (role === 'speaker' && !isAdmin) {
        // Verify attendee has been promoted to speaker role.
        const { data: attendee } = await adminClient
          .from('attendees')
          .select('role')
          .eq('id', attendee_id)
          .single()
        if (!attendee || attendee.role !== 'speaker') {
          return json({ error: 'Not a speaker' }, 403)
        }
      }
    }

    const roomName = `webinar-${webinar.slug}`
    // One stable identity per role-holder. The host's is derived from the
    // webinar, not from a session, so reconnecting replaces their old
    // participant instead of stacking up a second publisher.
    const identity =
      role === 'host'
        ? `host-${webinar.slug}`
        : attendee_id ?? `admin-${user?.id.slice(0, 8) ?? 'unknown'}`

    const token = await signLiveKitToken(
      apiKey,
      apiSecret,
      identity,
      roomName,
      role,
    )

    return json({ token, url: livekitUrl })
  } catch (err) {
    console.error('livekit-token error:', err)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function signLiveKitToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  roomName: string,
  role: 'host' | 'speaker' | 'viewer',
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // 1 hour

  const canPublish = role === 'host' || role === 'speaker'
  const canPublishData = true
  const canSubscribe = true

  const payload = {
    iss: apiKey,
    sub: identity,
    iat: now,
    exp,
    jti: crypto.randomUUID(),
    video: {
      room: roomName,
      roomJoin: true,
      canPublish,
      canPublishData,
      canSubscribe,
    },
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = b64url(JSON.stringify(header))
  const encodedPayload = b64url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const keyData = new TextEncoder().encode(apiSecret)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  )
  const encodedSig = b64url(new Uint8Array(signature))

  return `${signingInput}.${encodedSig}`
}

function b64url(input: string | Uint8Array): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
