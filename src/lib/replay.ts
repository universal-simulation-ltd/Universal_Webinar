import { deleteHostedUpload, storeHostedFile, type useUniversal } from '@unisim/sdk'
import { supabase } from './supabase'
import { recordingExtension } from './sessionRecorder'

// Replays: the link that goes out in the follow-up email.
//
// A replay link is `<this app>/replay/<id>` and is written to
// webinars.recording_url, which process-webinar-reminders already puts in the
// follow-up email (universal-platform 0073). The `webinar-recording` edge
// function (universal-platform) turns the id into a short-lived video URL.
//
//   u-<upload id>   the host's own recording, uploaded as an ordinary hosted
//                   file — product 'recorder', so it sits in their Universal
//                   Recorder and draws on the company's files pool (250 MB
//                   free, then a token; 50 MB a file), like every other upload.
//   c-<webinar id>-<hex>  a cloud recording (LiveKit Egress), written by the
//                   function's cloud-sync once the file exists.
//
// ⚠️ The object name below is what the function checks before it will play an
// upload (REPLAY_PATH_RE there). Change one, change both.

type Supabase = ReturnType<typeof useUniversal>['supabase']

/** The hosted product a replay is stored as — see the header. */
export const REPLAY_PRODUCT = 'recorder'
/** The per-file limit every hosted upload has (hostedFilesSign.ts HOSTED_MAX_BYTES). */
export const MAX_REPLAY_BYTES = 50 * 1024 * 1024
export const REPLAY_TYPES = ['video/mp4', 'video/webm'] as const

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const REPLAY_ID_RE = new RegExp(`^(u-${UUID}|c-${UUID}-[0-9a-f]{32})$`, 'i')
const REPLAY_URL_RE = new RegExp(`/replay/(u-${UUID}|c-${UUID}-[0-9a-f]{32})/?$`, 'i')

export function isReplayId(id: string): boolean {
  return REPLAY_ID_RE.test(id)
}

/** The replay id inside a recording_url this app wrote, else null (a pasted link). */
export function replayIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const m = REPLAY_URL_RE.exec(new URL(url).pathname)
    return m ? m[1].toLowerCase() : null
  } catch {
    return null
  }
}

export function uploadIdFromReplayId(id: string): string | null {
  return id.startsWith('u-') ? id.slice(2) : null
}

/** `<origin><base>replay/<id>` — the page that plays it. */
export function replayUrl(id: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${window.location.origin}${base}replay/${id}`
}

function randomHex(bytes = 12): string {
  const b = new Uint8Array(bytes)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function replayStoragePath(orgId: string, webinarId: string, mime: string): string {
  return `${orgId}/${REPLAY_PRODUCT}/${randomHex()}-webinar-replay-${webinarId}.${recordingExtension(mime)}`
}

export type UploadReplayResult =
  | { ok: true; replayId: string; creditsRemaining?: number }
  | { ok: false; error: 'too_big' | 'wrong_type' | 'not_authenticated' | 'no_org' | 'no_credits' | 'failed'; detail?: string }

/**
 * Store the file as a hosted upload (token/allowance first, then the bytes, and
 * a refund if the bytes fail — storeHostedFile does all three). The caller then
 * writes `replayUrl(replayId)` to recording_url.
 */
export async function uploadReplay(
  client: Supabase,
  input: { orgId: string | null; webinarId: string; file: Blob; fileName: string },
): Promise<UploadReplayResult> {
  const type = (input.file.type || '').split(';')[0]
  if (!(REPLAY_TYPES as readonly string[]).includes(type)) return { ok: false, error: 'wrong_type' }
  if (input.file.size > MAX_REPLAY_BYTES) return { ok: false, error: 'too_big' }
  if (!input.orgId) return { ok: false, error: 'no_org' }

  const stored = await storeHostedFile(client, {
    product: REPLAY_PRODUCT,
    storagePath: replayStoragePath(input.orgId, input.webinarId, type),
    fileName: input.fileName,
    body: input.file,
    contentType: type,
    // R2 first: Supabase's own storage is the 1 GB plan the whole suite shares.
    backends: ['r2', 'supabase'],
  })
  if (!stored.ok || !stored.upload_id) {
    const e = stored.error
    if (e === 'not_authenticated') return { ok: false, error: 'not_authenticated' }
    if (e === 'no_org') return { ok: false, error: 'no_org' }
    if (e === 'no_credits') return { ok: false, error: 'no_credits' }
    return { ok: false, error: 'failed', detail: e }
  }
  return { ok: true, replayId: `u-${stored.upload_id}`, creditsRemaining: stored.credits }
}

/** Delete an uploaded replay's bytes and refund it. Only the person who saved it can. */
export async function deleteUploadedReplay(client: Supabase, uploadId: string): Promise<boolean> {
  const { data } = await client
    .from('hosted_uploads')
    .select('id, storage_path, storage_backend')
    .eq('id', uploadId)
    .maybeSingle()
  if (!data) return false
  const res = await deleteHostedUpload(client, data as { id: string; storage_path: string; storage_backend?: 'r2' | 'supabase' })
  return !!res.ok
}

// ── The webinar-recording edge function ─────────────────────────────────────

async function callRecordingFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('webinar-recording', { body })
  if (error) {
    let detail: string | null = null
    try {
      const res = (error as { context?: Response }).context
      detail = res ? ((await res.json()) as { error?: string }).error ?? null : null
    } catch { /* not JSON */ }
    throw new Error(detail ?? error.message)
  }
  if (!data?.ok) throw new Error(data?.error ?? 'failed')
  return data as T
}

export interface PlayableReplay {
  url: string
  title: string | null
  host_label: string | null
  source: 'upload' | 'cloud'
  expires_at: string
}

export function playReplay(id: string): Promise<PlayableReplay> {
  return callRecordingFunction<PlayableReplay>({ action: 'play', id })
}

export interface CloudStatus {
  /** The server flag — false means cloud recording is switched off. */
  enabled: boolean
  configured: boolean
  /** A paid webinar (universal-platform 0202's webinar_free_caps). */
  entitled: boolean
  active: boolean
}

export function cloudStatus(slug: string, token: string): Promise<CloudStatus> {
  return callRecordingFunction<CloudStatus>({ action: 'cloud-status', slug, token })
}

export function startCloudRecording(slug: string, token: string): Promise<{ egress_id?: string }> {
  return callRecordingFunction({ action: 'cloud-start', slug, token })
}

export function stopCloudRecording(slug: string, token: string): Promise<{ stopped: number }> {
  return callRecordingFunction({ action: 'cloud-stop', slug, token })
}

export function syncCloudRecording(
  slug: string,
  token: string,
): Promise<{ recording_url: string | null; pending: boolean }> {
  return callRecordingFunction({ action: 'cloud-sync', slug, token })
}

/** Delete a cloud recording's file and clear the link. */
export function removeCloudReplay(slug: string, token: string): Promise<{ removed: boolean }> {
  return callRecordingFunction({ action: 'cloud-remove', slug, token })
}
