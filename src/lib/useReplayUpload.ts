import { useCallback, useEffect, useRef, useState } from 'react'
import { useOrg, useUniversal } from '@unisim/sdk'
import { updateWebinarByToken } from './host'
import { fill, formatMegabytes, useRecordingCopy, type RecordingCopy } from './recordingCopy'
import {
  MAX_REPLAY_BYTES,
  cancelReplayUpload,
  deleteUploadedReplay,
  replayUrl,
  uploadIdFromReplayId,
  uploadReplay,
  type ReplayUploadJob,
  type UploadReplayResult,
} from './replay'
import { storedBytes } from './multipartUpload'
import type { WebinarRow } from './database.types'

// "Upload as replay", shared by the wrap-up's Recording card and the host's
// Record control (the moment they press Stop). Uploads the file (in parts when
// it is over 50 MB), writes the /replay/<id> link to recording_url, and keeps a
// paused multipart upload around so "Resume" carries on where it stopped.

export function replayUploadError(
  copy: RecordingCopy,
  res: Extract<UploadReplayResult, { ok: false }>,
  size: number,
): string {
  switch (res.error) {
    case 'too_big':
      return fill(copy.tooBig, { size: formatMegabytes(size), max: formatMegabytes(MAX_REPLAY_BYTES) })
    case 'wrong_type':
      return copy.wrongType
    case 'not_authenticated':
      return copy.signIn
    case 'no_org':
      return copy.noOrg
    case 'no_credits':
      return copy.noCredits
    case 'cancelled':
      return UPLOAD_EN.cancelled
    default:
      return copy.uploadFailed
  }
}

/** English-only (Webinar's hosting pages are English; 2026-10-10). */
export const UPLOAD_EN = {
  /** {stored} {total} {pct} */
  progress: 'Uploading… {stored} of {total} ({pct}%)',
  paused: 'The upload stopped at {pct}% — the connection dropped. Nothing is lost: resume to carry on from there.',
  resume: 'Resume upload',
  cancel: 'Cancel upload',
  cancelled: 'Upload cancelled. Nothing was charged.',
  leaveWarning: 'Your replay is still uploading.',
}

export interface ReplayProgress {
  stored: number
  total: number
}

export function progressText(p: ReplayProgress): string {
  const pct = p.total > 0 ? Math.floor((p.stored / p.total) * 100) : 0
  return fill(UPLOAD_EN.progress, { stored: formatMegabytes(p.stored), total: formatMegabytes(p.total), pct })
}

export function useReplayUpload({
  webinarId,
  slug,
  token,
  onUploaded,
}: {
  webinarId: string
  slug: string
  token: string | null
  onUploaded: (next: WebinarRow) => void
}) {
  const copy = useRecordingCopy()
  const { supabase: client, session, activeOrgId } = useUniversal()
  // useOrg is what adopts a company as the active one when none is chosen yet.
  const { org } = useOrg()
  const orgId = org?.id ?? activeOrgId ?? null
  const signedIn = !!session && !session.user.is_anonymous

  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ReplayProgress | null>(null)
  const [paused, setPaused] = useState<ReplayUploadJob | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  // Leaving mid-upload loses it (and a paused one can't come back after a
  // reload), so ask first.
  useEffect(() => {
    if (!busy && !paused) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = UPLOAD_EN.leaveWarning
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [busy, paused])

  const run = useCallback(
    async (file: Blob, fileName: string, resume: ReplayUploadJob | null) => {
      setMessage(null)
      if (!token) return
      if (!signedIn) {
        setMessage(copy.signIn)
        return
      }
      setBusy(true)
      setPaused(null)
      setProgress({ stored: 0, total: file.size })
      const ctrl = new AbortController()
      abort.current = ctrl
      try {
        const res = await uploadReplay(client, {
          orgId,
          webinarId,
          file,
          fileName,
          resume,
          signal: ctrl.signal,
          onProgress: (stored, total) => setProgress({ stored, total }),
        })
        if (!res.ok) {
          if (res.resume) {
            setPaused(res.resume)
            const pct = res.resume.parts.size > 0
              ? Math.floor((storedBytes(res.resume.parts) / res.resume.parts.size) * 100)
              : 0
            setMessage(fill(UPLOAD_EN.paused, { pct }))
          } else {
            setMessage(replayUploadError(copy, res, file.size))
          }
          return
        }
        try {
          onUploaded(await updateWebinarByToken(slug, token, { recording_url: replayUrl(res.replayId) }))
        } catch {
          // The link didn't save, so nobody would ever see this upload: undo it
          // (and its charge) rather than leave it in their storage.
          const uploadId = uploadIdFromReplayId(res.replayId)
          if (uploadId) await deleteUploadedReplay(client, uploadId).catch(() => false)
          setMessage(copy.uploadFailed)
        }
      } finally {
        abort.current = null
        setBusy(false)
        setProgress(null)
      }
    },
    [client, copy, onUploaded, orgId, signedIn, slug, token, webinarId],
  )

  const start = useCallback((file: Blob, fileName: string) => run(file, fileName, null), [run])
  const resume = useCallback(() => {
    if (paused) void run(paused.file, paused.fileName, paused)
  }, [paused, run])
  const cancel = useCallback(async () => {
    if (abort.current) {
      abort.current.abort() // uploadReplay refunds a cancelled upload itself
      return
    }
    if (!paused) return
    const job = paused
    setPaused(null)
    await cancelReplayUpload(client, job)
    setMessage(UPLOAD_EN.cancelled)
  }, [client, paused])

  return { busy, progress, paused, message, setMessage, start, resume, cancel, signedIn }
}
