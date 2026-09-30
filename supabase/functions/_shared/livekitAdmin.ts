// Server-side LiveKit helpers shared by livekit-token and webinar-time-limit.
//
// LiveKit's RoomService is a Twirp API on the same host as the websocket URL,
// authorised by a short-lived JWT carrying an admin video grant (roomAdmin to
// list participants, roomCreate to delete a room). Signed with the project's
// API secret — never sent to a browser.

/** LIVEKIT_URL is the client's wss:// address; the API wants https://. */
export function livekitHttpUrl(): string {
  const raw = Deno.env.get('LIVEKIT_URL') ?? Deno.env.get('VITE_LIVEKIT_URL') ?? ''
  return raw.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/+$/, '')
}

export async function signAdminToken(
  apiKey: string,
  apiSecret: string,
  grant: { roomAdmin?: boolean; roomCreate?: boolean; room?: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: apiKey, sub: 'unisim-server', iat: now, nbf: now, exp: now + 300, video: grant }
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)))
  const input = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  return `${input}.${b64url(new Uint8Array(sig))}`
}

/** Identities currently in a room; [] when the room doesn't exist yet. */
export async function listParticipantIdentities(
  apiKey: string,
  apiSecret: string,
  room: string,
): Promise<string[] | null> {
  const base = livekitHttpUrl()
  if (!base) return null
  const token = await signAdminToken(apiKey, apiSecret, { roomAdmin: true, room })
  const res = await fetch(`${base}/twirp/livekit.RoomService/ListParticipants`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ room }),
  })
  if (res.status === 404) return []
  if (!res.ok) {
    // Twirp reports a missing room as not_found in the body on some versions.
    const text = await res.text()
    if (/not[_ ]found|does not exist/i.test(text)) return []
    console.error('ListParticipants failed', res.status, text)
    return null
  }
  const data = await res.json() as { participants?: { identity?: string }[] }
  return (data.participants ?? []).map((p) => p.identity ?? '')
}

function b64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
