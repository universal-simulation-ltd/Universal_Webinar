import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, FileVideo, Loader2, Trash2, Upload } from 'lucide-react'
import { useOrg, useUniversal } from '@unisim/sdk'
import { Button } from '@/components/ui/button'
import { updateWebinarByToken } from '@/lib/host'
import { useFinishedRecording } from '@/lib/recordingStore'
import { fill, formatDuration, formatMegabytes, useRecordingCopy, type RecordingCopy } from '@/lib/recordingCopy'
import {
  MAX_REPLAY_BYTES,
  REPLAY_TYPES,
  deleteUploadedReplay,
  removeCloudReplay,
  replayIdFromUrl,
  replayUrl,
  syncCloudRecording,
  uploadIdFromReplayId,
  uploadReplay,
  type UploadReplayResult,
} from '@/lib/replay'
import type { WebinarRow } from '@/lib/database.types'

function uploadError(copy: RecordingCopy, res: Extract<UploadReplayResult, { ok: false }>, size: number): string {
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
    default:
      return copy.uploadFailed
  }
}

/**
 * The replay half of the wrap-up's Recording card: upload the recording the
 * host just made (or any MP4/WebM from disk) as the replay, and the link is
 * written to recording_url — which the follow-up email already carries.
 */
export function ReplayPanel({
  webinar,
  token,
  onChange,
}: {
  webinar: WebinarRow
  token: string
  onChange: (next: WebinarRow) => void
}) {
  const copy = useRecordingCopy()
  const { supabase: client, session, activeOrgId } = useUniversal()
  // useOrg is what adopts a company as the active one when none is chosen yet.
  const { org } = useOrg()
  const orgId = org?.id ?? activeOrgId ?? null
  const signedIn = !!session && !session.user.is_anonymous
  const finished = useFinishedRecording(webinar.slug)
  const replayId = replayIdFromUrl(webinar.recording_url)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [cloudPending, setCloudPending] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // A cloud recording (when that is switched on) finishes processing a little
  // after the room ends; ask for it, and keep asking for a few minutes. The
  // function refuses quietly when cloud recording is off, which ends this.
  const hasLink = !!webinar.recording_url
  useEffect(() => {
    if (hasLink) return
    let alive = true
    let tries = 0
    let timer: number | undefined
    const check = async () => {
      try {
        const res = await syncCloudRecording(webinar.slug, token)
        if (!alive) return
        if (res.recording_url) {
          setCloudPending(false)
          onChange({ ...webinar, recording_url: res.recording_url })
          return
        }
        setCloudPending(res.pending)
        if (res.pending && ++tries < 30) timer = window.setTimeout(check, 20_000)
      } catch {
        if (alive) setCloudPending(false)
      }
    }
    void check()
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
    // Only when the link appears or goes; `webinar` changes with every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLink, webinar.slug, token])

  async function upload(file: Blob, fileName: string) {
    setMessage(null)
    if (!signedIn) {
      setMessage(copy.signIn)
      return
    }
    setBusy('upload')
    try {
      const res = await uploadReplay(client, { orgId, webinarId: webinar.id, file, fileName })
      if (!res.ok) {
        setMessage(uploadError(copy, res, file.size))
        return
      }
      try {
        onChange(await updateWebinarByToken(webinar.slug, token, { recording_url: replayUrl(res.replayId) }))
      } catch {
        // The link didn't save, so nobody would ever see this upload: undo it
        // (and its charge) rather than leave it in their storage.
        const uploadId = uploadIdFromReplayId(res.replayId)
        if (uploadId) await deleteUploadedReplay(client, uploadId).catch(() => false)
        setMessage(copy.uploadFailed)
      }
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!replayId) return
    setMessage(null)
    setBusy('remove')
    try {
      const uploadId = uploadIdFromReplayId(replayId)
      if (uploadId) {
        // Frees the storage (and refunds it) when this is the device that
        // saved it; otherwise the file stays in their Universal Recorder.
        if (signedIn) await deleteUploadedReplay(client, uploadId).catch(() => false)
        onChange(await updateWebinarByToken(webinar.slug, token, { recording_url: null }))
      } else {
        await removeCloudReplay(webinar.slug, token)
        onChange({ ...webinar, recording_url: null })
      }
    } catch {
      setMessage(copy.uploadFailed)
    } finally {
      setBusy(null)
    }
  }

  if (replayId && webinar.recording_url) {
    return (
      <div className="mb-3 space-y-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3" data-testid="replay-ready">
        <p className="flex items-start gap-2 text-sm text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {copy.replayReady}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={webinar.recording_url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              {copy.watch}
            </a>
          </Button>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void remove()}>
            {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {busy === 'remove' ? copy.removing : copy.remove}
          </Button>
        </div>
        {message && <p className="text-xs text-red-700 dark:text-red-400" role="alert">{message}</p>}
      </div>
    )
  }

  if (webinar.recording_url) return null // a link the host pasted: the field below owns it

  const tooBig = !!finished && finished.bytes > MAX_REPLAY_BYTES
  return (
    <div className="mb-3 space-y-2" data-testid="replay-panel">
      {finished && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
          <p className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <FileVideo className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
            {fill(copy.yourRecording, {
              duration: formatDuration(finished.durationMs),
              size: formatMegabytes(finished.bytes),
            })}
          </p>
          {tooBig ? (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
              {fill(copy.tooBig, { size: formatMegabytes(finished.bytes), max: formatMegabytes(MAX_REPLAY_BYTES) })}
            </p>
          ) : (
            <Button
              size="sm"
              className="mt-2"
              disabled={busy !== null}
              onClick={() => void upload(finished.file, finished.fileName)}
            >
              {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy === 'upload' ? copy.uploading : copy.uploadReplay}
            </Button>
          )}
        </div>
      )}

      <div>
        <input
          ref={fileInput}
          type="file"
          accept={REPLAY_TYPES.join(',')}
          className="hidden"
          data-testid="replay-file"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void upload(f, f.name)
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={() => fileInput.current?.click()}
        >
          {busy === 'upload' && !finished ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {copy.uploadFile}
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy.uploadHint}</p>
      {cloudPending && <p className="text-xs text-slate-600 dark:text-slate-300" role="status">{copy.cloudProcessing}</p>}
      {message && <p className="text-xs text-red-700 dark:text-red-400" role="alert">{message}</p>}
    </div>
  )
}
