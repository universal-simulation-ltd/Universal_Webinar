import { downscaleImage } from '@unisim/sdk'
import { supabase } from './supabase'

/**
 * The document a host puts on the stage — upload, replace and remove.
 *
 * Storage is the public `webinar-docs` bucket (migration 0098) under
 * `<webinar_id>/<random>.<ext>`. Writes need an auth session, which the host
 * already has: OTP verification is compulsory before going live.
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
  /** Bytes actually stored, so the UI can say what the shrink achieved. */
  size: number
  /** Bytes of the file the host picked. Equal to `size` when nothing shrank. */
  originalSize: number
}

export function isSharedDocType(type: string): boolean {
  return (SHARED_DOC_TYPES as readonly string[]).includes(type)
}

const EXT_FOR_TYPE: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function randomName(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

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
  webinarId: string,
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

  const ext = EXT_FOR_TYPE[upload.type] ?? EXT_FOR_TYPE[file.type] ?? 'pdf'
  const path = `${webinarId}/${randomName()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, upload, { contentType: upload.type, upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: data.publicUrl,
    // The host's own filename, not the randomised storage one — it's what they
    // recognise, and guests see it as the label above the document.
    name: file.name,
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
export async function removeSharedDoc(url: string): Promise<void> {
  const marker = `/${BUCKET}/`
  const at = url.indexOf(marker)
  if (at === -1) return
  const path = decodeURIComponent(url.slice(at + marker.length).split('?')[0])
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
