// Replays bigger than one PUT: R2 multipart through the platform's
// `hosted-files` function and the `unisim-hosted-files` Worker
// (universal-platform, 2026-10-10).
//
//   1. 'multipart-create' {path, content_type} → an upload id and three signed
//      URLs (part / complete / abort), good for six hours.
//   2. PUT each HOSTED_PART_BYTES slice to `part_url&part=N` — three at a time,
//      each retried with back-off — and keep its {part, etag}.
//   3. POST {parts} to complete_url.
//
// Resume is the cheap kind: the upload id and every finished part live in a
// MultipartState the caller holds on to. If the network drops, "Resume" carries
// on from the parts still missing (re-signing the URLs if they have run out)
// instead of starting again. It does not survive a reload — the File would have
// to be picked again, and the ledger row is reserved for this attempt only.
//
// No React and no Supabase import here, so `multipartUpload.test.mjs` drives it
// with a fake Worker.

/** Must match HOSTED_PART_BYTES in universal-platform's hostedFilesSign.ts; the
 *  server also returns it as `part_bytes`, which is what is actually used. */
export const PART_BYTES = 16 * 1024 * 1024
/** Parts in flight at once. */
const CONCURRENCY = 3
/** Attempts per part before the upload is paused for a manual resume. */
const ATTEMPTS = 4

export type InvokeHostedFiles = (body: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null; error: string | null }>

export interface MultipartUrls {
  uploadId: string
  partUrl: string
  completeUrl: string
  abortUrl: string
  partBytes: number
}

export interface MultipartState {
  path: string
  contentType: string
  size: number
  urls: MultipartUrls | null
  /** part number → etag, for every part already stored. */
  done: Map<number, string>
}

export interface PartRange {
  part: number
  start: number
  end: number
}

/** The slices of a `size`-byte file: every part full-size except the last. */
export function planParts(size: number, partBytes: number): PartRange[] {
  if (!(size > 0) || !(partBytes > 0)) return []
  const out: PartRange[] = []
  for (let part = 1, start = 0; start < size; part++, start += partBytes) {
    out.push({ part, start, end: Math.min(size, start + partBytes) })
  }
  return out
}

export function newMultipartState(path: string, contentType: string, size: number): MultipartState {
  return { path, contentType, size, urls: null, done: new Map() }
}

/** Bytes already stored, for a progress bar. */
export function storedBytes(state: MultipartState): number {
  const partBytes = state.urls?.partBytes ?? PART_BYTES
  return planParts(state.size, partBytes)
    .filter((p) => state.done.has(p.part))
    .reduce((sum, p) => sum + (p.end - p.start), 0)
}

function urlsFrom(data: Record<string, unknown> | null): MultipartUrls | null {
  if (!data) return null
  const { upload_id, part_url, complete_url, abort_url, part_bytes } = data as Record<string, unknown>
  if (typeof upload_id !== 'string' || typeof part_url !== 'string' || typeof complete_url !== 'string' || typeof abort_url !== 'string') {
    return null
  }
  return {
    uploadId: upload_id,
    partUrl: part_url,
    completeUrl: complete_url,
    abortUrl: abort_url,
    partBytes: typeof part_bytes === 'number' && part_bytes > 0 ? part_bytes : PART_BYTES,
  }
}

export class MultipartError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.name = 'MultipartError'
    this.code = code
  }
}

export interface UploadPartsOptions {
  invoke: InvokeHostedFiles
  file: Blob
  state: MultipartState
  onProgress?: (stored: number, total: number) => void
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  /** Back-off before attempt n (1-based); tests pass () => 0. */
  delayMs?: (attempt: number) => number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? `http_${res.status}`
  } catch {
    return `http_${res.status}`
  }
}

/**
 * Upload whatever parts of `file` the state does not have yet, then complete.
 * Throws MultipartError on a failure worth showing; the state keeps every
 * finished part, so calling again resumes.
 */
export async function uploadParts(opts: UploadPartsOptions): Promise<{ size: number }> {
  const { invoke, file, state, onProgress, signal } = opts
  const doFetch = opts.fetchImpl ?? fetch
  const delay = opts.delayMs ?? ((n: number) => Math.min(8000, 500 * 2 ** (n - 1)))

  if (!state.urls) {
    const res = await invoke({ action: 'multipart-create', path: state.path, content_type: state.contentType })
    const urls = urlsFrom(res.data)
    if (!urls) throw new MultipartError(res.error ?? 'create_failed')
    state.urls = urls
  }

  let renewing: Promise<void> | null = null
  const renew = () => {
    renewing ??= (async () => {
      const res = await invoke({ action: 'multipart-sign', path: state.path, upload_id: state.urls!.uploadId })
      const urls = urlsFrom(res.data)
      if (!urls) throw new MultipartError(res.error ?? 'sign_failed')
      state.urls = urls
    })().finally(() => {
      renewing = null
    })
    return renewing
  }

  const total = state.size
  const report = () => onProgress?.(storedBytes(state), total)
  report()

  const todo = planParts(total, state.urls.partBytes).filter((p) => !state.done.has(p.part))
  let failure: MultipartError | null = null

  const sendPart = async (p: PartRange) => {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      if (signal?.aborted) throw new MultipartError('cancelled')
      if (failure) return
      try {
        const res = await doFetch(`${state.urls!.partUrl}&part=${p.part}`, {
          method: 'PUT',
          body: file.slice(p.start, p.end),
          signal,
        })
        if (res.ok) {
          const body = (await res.json()) as { etag?: string }
          if (!body.etag) throw new MultipartError('no_etag')
          state.done.set(p.part, body.etag)
          report()
          return
        }
        const code = await errorCode(res)
        if (code === 'expired') {
          await renew()
          attempt-- // a stale URL is not the network's fault
          continue
        }
        // The Worker refused the part itself: retrying will not help.
        if (res.status === 400 || res.status === 403 || res.status === 404 || res.status === 413) throw new MultipartError(code)
      } catch (err) {
        if (err instanceof MultipartError) throw err
        if (signal?.aborted) throw new MultipartError('cancelled')
        // A network error: fall through to the back-off.
      }
      if (attempt < ATTEMPTS) await sleep(delay(attempt))
    }
    throw new MultipartError('network')
  }

  const queue = [...todo]
  const worker = async () => {
    while (queue.length > 0 && !failure) {
      const p = queue.shift()!
      try {
        await sendPart(p)
      } catch (err) {
        failure ??= err instanceof MultipartError ? err : new MultipartError('failed')
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length || 1) }, worker))
  if (failure) throw failure

  const parts = [...state.done.entries()].sort((a, b) => a[0] - b[0]).map(([part, etag]) => ({ part, etag }))
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new MultipartError('cancelled')
    try {
      const res = await doFetch(state.urls!.completeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts }),
        signal,
      })
      if (res.ok) {
        const body = (await res.json()) as { size?: number }
        return { size: body.size ?? total }
      }
      const code = await errorCode(res)
      if (code === 'expired') {
        await renew()
        attempt--
        continue
      }
      throw new MultipartError(code)
    } catch (err) {
      if (err instanceof MultipartError) throw err
      if (signal?.aborted) throw new MultipartError('cancelled')
    }
    if (attempt < ATTEMPTS) await sleep(delay(attempt))
  }
  throw new MultipartError('network')
}

/** Abandon an upload's parts (best effort; R2's lifecycle rule is the backstop). */
export async function abortParts(state: MultipartState, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (!state.urls) return
  await fetchImpl(state.urls.abortUrl, { method: 'DELETE' }).catch(() => undefined)
}
