import { downscaleImage } from '@unisim/sdk'
import { supabase } from './supabase'

/**
 * The document a host puts on the stage — upload, replace and remove.
 *
 * Storage is the public `webinar-docs` bucket (migration 0098) under
 * `<webinar_id>/<random>.<ext>`.
 *
 * ⚠️ Writes go through the `webinar-doc` edge function, NOT straight to
 * storage. 0098's policies require an auth session whose email matches the
 * host's, and a manage-token host frequently hasn't got one: `host_verified`
 * is a column that stays true forever while the browser session expires, and a
 * host who ever joined their own room as a guest holds an *anonymous* session,
 * which passes the `to authenticated` role check while carrying no email claim
 * at all. Both fail with `new row violates row-level security policy`.
 *
 * The function validates the manage token — this app's actual authorisation
 * model — and returns a signed upload URL, so the bytes still go browser →
 * storage directly and never through the function.
 */

const BUCKET = 'webinar-docs'

/** Matches the bucket's `allowed_mime_types`. Anything else is refused here so
 *  the host gets a sentence instead of a storage error. */
export const SHARED_DOC_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

/** The bucket's own `file_size_limit`. Refuse above this ourselves. */
export const MAX_DOC_BYTES = 25 * 1024 * 1024

/**
 * Images are re-encoded before upload; a phone photo of a whiteboard is
 * routinely 8 MB and reads perfectly at a fraction of that. 2000px is chosen
 * for reading, not for chrome — the 512px used for avatars would turn slide
 * text to mush on a laptop screen.
 */
const IMAGE_MAX_DIMENSION = 2000
const IMAGE_MAX_BYTES = 1.5 * 1024 * 1024

export interface SharedDocUpload {
  url: string
  name: string
  /** Storage path, so the caller can ask for it back later. */
  path: string
  /** Bytes actually stored, so the UI can say what the shrink achieved. */
  size: number
  /** Bytes of the file the host picked. Equal to `size` when nothing shrank. */
  originalSize: number
}

interface SignResponse {
  ok: boolean
  error?: string
  path?: string
  token?: string
  publicUrl?: string
}

/** Call the manage-token gatekeeper. Throws with whatever it said went wrong. */
async function callDocFunction(body: Record<string, unknown>): Promise<SignResponse> {
  const { data, error } = await supabase.functions.invoke<SignResponse>('webinar-doc', {
    body,
  })
  if (error) {
    // A non-2xx carries the function's own message in the response body, which
    // is far more useful than "Edge Function returned a non-2xx status code".
    const detail = await readFunctionError(error)
    throw new Error(detail ?? error.message)
  }
  if (!data?.ok) throw new Error(data?.error ?? 'That did not work.')
  return data
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const res = (error as { context?: Response })?.context
  if (!res || typeof res.json !== 'function') return null
  try {
    const body = (await res.json()) as { error?: string }
    return body?.error ?? null
  } catch {
    return null
  }
}

export function isSharedDocType(type: string): boolean {
  return (SHARED_DOC_TYPES as readonly string[]).includes(type)
}

// The storage path (and therefore the extension and the random filename) is
// decided by the `webinar-doc` function, not here — it owns the webinar-id
// prefix that scopes the signed URL, and a client-chosen path would be a
// client-chosen scope.

/**
 * Shrink what we can.
 *
 * Images go through the SDK's `downscaleImage`, the same helper behind profile
 * photos and org logos.
 *
 * PDFs are uploaded untouched, and that is a real limitation rather than an
 * oversight: meaningful PDF compression means re-encoding the images embedded
 * inside it, which needs a full renderer, and the cheap alternative — rasterising
 * every page to canvas and rebuilding — destroys selectable text and turns
 * vector diagrams into blurry bitmaps. A deck that is too big is better refused
 * with an explanation than silently ruined.
 */
async function prepare(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  return downscaleImage(file, {
    maxDimension: IMAGE_MAX_DIMENSION,
    maxBytes: IMAGE_MAX_BYTES,
  })
}

/**
 * Upload and return the public URL. Throws with a host-readable message.
 *
 * The caller is responsible for saving the returned url/name onto the webinar
 * (via `update_webinar_by_token`) — this only puts the bytes in place.
 */
export async function uploadSharedDoc(
  slug: string,
  manageToken: string,
  file: File,
): Promise<SharedDocUpload> {
  if (!isSharedDocType(file.type)) {
    throw new Error('Share a PDF, PNG, JPG or WebP.')
  }

  const upload = await prepare(file)

  // Re-checked after the shrink, not before: an 8 MB photo is fine because it
  // will land at well under 2 MB, while a 30 MB PDF genuinely cannot be sent.
  if (upload.size > MAX_DOC_BYTES) {
    const mb = Math.round(MAX_DOC_BYTES / 1024 / 1024)
    throw new Error(
      file.type === 'application/pdf'
        ? `That PDF is ${(upload.size / 1024 / 1024).toFixed(1)} MB and the limit is ${mb} MB. PDFs can't be compressed in the browser without wrecking the text — export it at a lower quality, or split it.`
        : `That file is too big — the limit is ${mb} MB.`,
    )
  }

  // The function decides the path (it owns the webinar-id prefix) and hands
  // back a token good for that one object.
  const signed = await callDocFunction({
    slug,
    token: manageToken,
    action: 'sign-upload',
    contentType: upload.type,
  })
  if (!signed.path || !signed.token || !signed.publicUrl) {
    throw new Error('Could not start the upload.')
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(signed.path, signed.token, upload, {
      contentType: upload.type,
    })
  if (error) throw error

  return {
    url: signed.publicUrl,
    // The host's own filename, not the randomised storage one — it's what they
    // recognise, and guests see it as the label above the document.
    name: file.name,
    path: signed.path,
    size: upload.size,
    originalSize: file.size,
  }
}

/**
 * Delete the stored object behind a shared-doc URL.
 *
 * Best-effort: a failure here must not stop the host clearing the document from
 * the stage, or a storage hiccup would leave them unable to take it down. The
 * orphaned object goes when the webinar is purged.
 */
export async function removeSharedDoc(
  slug: string,
  manageToken: string,
  url: string,
): Promise<void> {
  const marker = `/${BUCKET}/`
  const at = url.indexOf(marker)
  if (at === -1) return
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0])
  if (!path) return
  try {
    await callDocFunction({ slug, token: manageToken, action: 'remove', path })
  } catch {
    // Swallowed on purpose — see the doc comment. The caller has already
    // cleared the reference, or is about to.
  }
}
