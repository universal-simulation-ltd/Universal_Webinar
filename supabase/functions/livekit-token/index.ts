// Supabase Edge Function — livekit-token
// Generates a signed LiveKit access token.
//
// Required env vars in Supabase Dashboard → Settings → Edge Functions:
//   LIVEKIT_API_KEY     — from your LiveKit Cloud project
//   LIVEKIT_API_SECRET  — from your LiveKit Cloud project
//
// Called from the frontend via supabase.functions.invoke('livekit-token', { body: { ... } }).

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

    // Verify the caller's JWT.
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { webinar_id, attendee_id, role } = await req.json() as {
      webinar_id: string
      attendee_id: string | null
      role: 'host' | 'speaker' | 'viewer'
    }

    if (!webinar_id) return json({ error: 'webinar_id required' }, 400)

    // Verify the webinar exists.
    const { data: webinar } = await adminClient
      .from('webinars')
      .select('id, slug')
      .eq('id', webinar_id)
      .single()

    if (!webinar) return json({ error: 'Webinar not found' }, 404)

    // Validate caller is allowed to request the role they asked for.
    const callerEmail = user.email?.toLowerCase()
    const isAdmin = callerEmail === 'accounts@unisim.co.uk'

    if (role === 'host' && !isAdmin) {
      return json({ error: 'Only the admin may request a host token' }, 403)
    }

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

    const roomName = `webinar-${webinar.slug}`
    const identity = attendee_id ?? `admin-${user.id.slice(0, 8)}`

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
