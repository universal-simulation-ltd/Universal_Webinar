import { consumeHostedUpload, deleteHostedUpload, storeHostedFile, type useUniversal } from '@unisim/sdk'
import { supabase } from './supabase'
import { recordingExtension } from './sessionRecorder'
import {
  MultipartError,
  abortParts,
  newMultipartState,
  uploadParts,
  type InvokeHostedFiles,
  type MultipartState,
} from './multipartUpload'

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
//                   free, then a token), like every other upload. Up to 50 MB
//                   goes in one PUT; bigger, up to 2 GB, in 16 MB parts
//                   (multipartUpload.ts) — R2 only.
//   c-<webinar id>-<hex>  a cloud recording (LiveKit Egress), written by the
//                   function's cloud-sync once the file exists.
//
// ⚠️ The object name below is what the function checks before it will play an
// upload (REPLAY_PATH_RE there). Change one, change both.

type Supabase = ReturnType<typeof useUniversal>['supabase']

/** The hosted product a replay is stored as — see the header. */
export const REPLAY_PRODUCT = 'recorder'
/** The most one signed PUT may carry (hostedFilesSign.ts HOSTED_MAX_BYTES). */
export const SINGLE_PUT_MAX_BYTES = 50 * 1024 * 1024
/** The biggest replay (hostedFilesSign.ts HOSTED_MULTIPART_MAX_BYTES, enforced
 *  by the hosted-files function and the Worker): about four hours at the
 *  in-browser recorder's ~500 MB an hour. */
export const MAX_REPLAY_BYTES = 2 * 1024 * 1024 * 1024
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

/** A multipart replay upload that stopped part-way and can carry on. */
export interface ReplayUploadJob {
  uploadId: string
  storagePath: string
  file: Blob
  fileName: string
  parts: MultipartState
}

export type UploadReplayResult =
  | { ok: true; replayId: string; creditsRemaining?: number }
  | {
      ok: false
      error: 'too_big' | 'wrong_type' | 'not_authenticated' | 'no_org' | 'no_credits' | 'cancelled' | 'failed'
      detail?: string
      /** Present when the upload paused part-way: pass it back to resume. */
      resume?: ReplayUploadJob
    }

export interface UploadReplayInput {
  orgId: string | null
  webinarId: string
  file: Blob
  fileName: string
  /** Bytes stored so far, of the whole file. */
  onProgress?: (stored: number, total: number) => void
  signal?: AbortSignal
  /** Carry on with an upload that paused (from a failed result's `resume`). */
  resume?: ReplayUploadJob | null
}

function hostedFilesInvoker(client: Supabase): InvokeHostedFiles {
  return async (body) => {
    try {
      const { data, error } = await client.functions.invoke('hosted-files', { body })
      if (error) {
        let code: string | null = null
        try {
          const res = (error as { context?: Response }).context
          code = res ? ((await res.json()) as { error?: string }).error ?? null : null
        } catch { /* not JSON */ }
        return { data: null, error: code ?? error.message }
      }
      const res = data as ({ ok?: boolean; error?: string } & Record<string, unknown>) | null
      if (!res || res.ok === false) return { data: null, error: res?.error ?? 'failed' }
      return { data: res, error: null }
    } catch (e) {
      return { data: null, error: (e as Error)?.message ?? 'failed' }
    }
  }
}

function consumeError(e: string | undefined): Extract<UploadReplayResult, { ok: false }> {
  if (e === 'not_authenticated') return { ok: false, error: 'not_authenticated' }
  if (e === 'no_org') return { ok: false, error: 'no_org' }
  if (e === 'no_credits') return { ok: false, error: 'no_credits' }
  return { ok: false, error: 'failed', detail: e }
}

/** Part-upload errors a resume cannot fix: the upload is abandoned and refunded.
 *  Anything else (the network, a 5xx) pauses it for a resume. */
const FINAL_PART_ERRORS = new Set([
  'forbidden', 'too_large', 'unsupported_type', 'size_unknown', 'bad_part', 'bad_parts',
  'upload_not_found', 'complete_failed', 'cancelled', 'no_etag',
])

/**
 * Store the file as a hosted upload (token/allowance first, then the bytes, and
 * a refund if the bytes fail). The caller then writes `replayUrl(replayId)` to
 * recording_url.
 *
 * Up to 50 MB: one PUT (storeHostedFile). Bigger: the ledger row is reserved on
 * R2 for the whole size, then the file goes up in parts; a network failure part
 * way returns `resume`, and anything else refunds.
 */
export async function uploadReplay(client: Supabase, input: UploadReplayInput): Promise<UploadReplayResult> {
  const type = (input.file.type || '').split(';')[0]
  if (!(REPLAY_TYPES as readonly string[]).includes(type)) return { ok: false, error: 'wrong_type' }
  if (input.file.size > MAX_REPLAY_BYTES) return { ok: false, error: 'too_big' }
  if (!input.orgId) return { ok: false, error: 'no_org' }

  if (!input.resume && input.file.size <= SINGLE_PUT_MAX_BYTES) {
    input.onProgress?.(0, input.file.size)
    const stored = await storeHostedFile(client, {
      product: REPLAY_PRODUCT,
      storagePath: replayStoragePath(input.orgId, input.webinarId, type),
      fileName: input.fileName,
      body: input.file,
      contentType: type,
      // R2 first: Supabase's own storage is the 1 GB plan the whole suite shares.
      backends: ['r2', 'supabase'],
    })
    if (!stored.ok || !stored.upload_id) return consumeError(stored.error)
    input.onProgress?.(input.file.size, input.file.size)
    return { ok: true, replayId: `u-${stored.upload_id}`, creditsRemaining: stored.credits }
  }

  let job = input.resume ?? null
  let credits: number | undefined
  if (!job) {
    const storagePath = replayStoragePath(input.orgId, input.webinarId, type)
    const consumed = await consumeHostedUpload(client, {
      product: REPLAY_PRODUCT,
      storagePath,
      fileName: input.fileName,
      sizeBytes: input.file.size,
      // R2 only: Supabase Storage can't hold a file this size.
      backends: ['r2'],
    })
    if (!consumed.ok || !consumed.upload_id) return consumeError(consumed.error)
    credits = consumed.credits
    const backend = (consumed as { storage_backend?: 'r2' | 'supabase' }).storage_backend
    if (backend !== 'r2') {
      await deleteHostedUpload(client, { id: consumed.upload_id, storage_path: storagePath, storage_backend: backend ?? 'supabase' })
      return { ok: false, error: 'too_big', detail: 'r2_unavailable' }
    }
    job = {
      uploadId: consumed.upload_id,
      storagePath,
      file: input.file,
      fileName: input.fileName,
      parts: newMultipartState(storagePath, type, input.file.size),
    }
  }

  try {
    await uploadParts({
      invoke: hostedFilesInvoker(client),
      file: job.file,
      state: job.parts,
      onProgress: input.onProgress,
      signal: input.signal,
    })
    return { ok: true, replayId: `u-${job.uploadId}`, creditsRemaining: credits }
  } catch (err) {
    const code = err instanceof MultipartError ? err.code : 'failed'
    // Never got as far as an upload id (the function or Worker refused to
    // start one): nothing to resume, so refund now rather than hold the charge.
    const resumable = !!job.parts.urls && !FINAL_PART_ERRORS.has(code)
    if (resumable) return { ok: false, error: 'failed', detail: code, resume: job }
    await cancelReplayUpload(client, job)
    if (code === 'cancelled') return { ok: false, error: 'cancelled' }
    if (code === 'too_large') return { ok: false, error: 'too_big' }
    return { ok: false, error: 'failed', detail: code }
  }
}

/** Give up on a paused upload: drop its parts and refund the reservation. */
export async function cancelReplayUpload(client: Supabase, job: ReplayUploadJob): Promise<void> {
  await abortParts(job.parts)
  await deleteHostedUpload(client, { id: job.uploadId, storage_path: job.storagePath, storage_backend: 'r2' }).catch(() => undefined)
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
