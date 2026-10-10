import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnectionState, useRoomContext, useSpeakingParticipants, useTracks } from '@livekit/components-react'
import { ConnectionState, Track, type Participant } from 'livekit-client'
import { Circle, Cloud, Download, Loader2, Square, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SessionRecorder,
  baseMime,
  pickRecordingMime,
  recordingExtension,
  supportsSessionRecording,
  type StageLayout,
} from '@/lib/sessionRecorder'
import {
  downloadBlob,
  openDeviceFile,
  putFinishedRecording,
  recordingFileName,
  type DeviceFile,
} from '@/lib/recordingStore'
import { RECORDING_ATTRIBUTE } from '@/lib/recordingSignal'
import { withWebmDuration } from '@/lib/webmDuration'
import { fill, formatDuration, formatMegabytes, useRecordingCopy } from '@/lib/recordingCopy'
import { MAX_REPLAY_BYTES } from '@/lib/replay'
import { useReplayUpload } from '@/lib/useReplayUpload'
import { ReplayUploadStatus } from '@/components/ReplayUploadStatus'
import type { WebinarRow } from '@/lib/database.types'
import {
  cloudStatus,
  startCloudRecording,
  stopCloudRecording,
  type CloudStatus,
} from '@/lib/replay'

type Phase = 'idle' | 'starting' | 'recording' | 'stopping'

/** English-only (Webinar's hosting pages are English; 2026-10-10). */
const STOP_EN = {
  /** {size} */
  ready: 'Recording stopped ({size}). Download it, or upload it as the replay.',
  download: 'Download',
  discardConfirm: 'Your last recording hasn’t been downloaded or uploaded. Start a new one anyway?',
}

interface Active {
  rec: SessionRecorder
  device: DeviceFile | null
  fileName: string
}

/** The take the host just stopped, offered for Download / Upload as replay. */
interface Take {
  file: Blob
  fileName: string
  /** Already on disk (streamed there, or downloaded): no Download needed. */
  saved: boolean
}

/** The name drawn on the recording; LiveKit names are unset for the host. */
function displayName(p: Participant): string | null {
  return p.name || null
}

/**
 * "Record this webinar" for the host, inside their LiveKit stage.
 *
 * The free recording runs in this browser (lib/sessionRecorder) and saves to
 * the host's device; while it runs the host's participant carries the
 * `recording` attribute, which is what puts the Recording badge on every
 * guest's screen. If the stage closes under a running recording — Leave the
 * stage, End webinar, a dropped connection — it is finished and saved, never
 * thrown away.
 *
 * When the host presses Stop, the take is offered right here: Download (unless
 * it was already streamed to a file they picked) and Upload as replay, which
 * stores it and writes the /replay link into the follow-up email — the same
 * upload the wrap-up page offers.
 *
 * ── Why a canvas mix, not tab capture (getDisplayMedia) ─────────────────────
 * Re-checked 2026-10-10 when James asked for "the host's tab, or the LiveKit
 * tracks mixed into a canvas — whichever works in Chrome, Edge AND Safari".
 * Tab capture fails that bar: `preferCurrentTab` / self-browser-surface are
 * Chromium-only, Safari can only offer a whole screen or window (no tab, no tab
 * audio), and on every browser the host must pick from a sharing prompt each
 * time, may pick the wrong thing, and records whatever else is on screen —
 * chat, notes, notifications. Tab audio would also miss the host's own mic
 * (a tab never plays itself back). The canvas + Web Audio mix needs no prompt,
 * records exactly the stage guests see with every mic in the room, keeps going
 * when the host switches to their slides (worker clock), and runs on all three
 * browsers (canvas.captureStream + MediaRecorder; MP4 on Safari).
 *
 * Cloud recording shows only when the server says it is switched on; it is off
 * until the server's flag is switched on (the platform's webinar-recording function).
 */
export function RecordControl({
  slug,
  title,
  manageToken,
  webinarId,
  onReplay,
}: {
  slug: string
  title: string
  manageToken: string | null
  /** For Upload as replay; without it (or a manage token) only Download shows. */
  webinarId?: string
  onReplay?: (next: WebinarRow) => void
}) {
  const copy = useRecordingCopy()
  const room = useRoomContext()
  const connected = useConnectionState() === ConnectionState.Connected
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const active = useRef<Active | null>(null)
  const [take, setTake] = useState<Take | null>(null)
  const [uploaded, setUploaded] = useState(false)
  const upload = useReplayUpload({
    webinarId: webinarId ?? '',
    slug,
    token: manageToken,
    onUploaded: (next) => {
      setUploaded(true)
      onReplay?.(next)
    },
  })
  const canUpload = !!webinarId && !!manageToken && !!onReplay
  const copyRef = useRef(copy)
  copyRef.current = copy

  // ── What goes in the picture ──────────────────────────────────────────────
  const refs = useTracks(
    [Track.Source.ScreenShare, Track.Source.Camera, Track.Source.Microphone, Track.Source.ScreenShareAudio],
    { onlySubscribed: false },
  )
  const speaking = useSpeakingParticipants()
  // The last person heard who has a camera on stays on screen until somebody
  // else speaks — so the picture doesn't cut away at every pause for breath.
  const lastSpeaker = useRef<string | null>(null)

  const live = refs.filter((r) => r.publication?.track?.mediaStreamTrack && !r.publication.isMuted)
  const cameraOf = (identity: string | null | undefined) =>
    identity ? live.find((r) => r.source === Track.Source.Camera && r.participant.identity === identity) : undefined
  const talker = speaking.find((p) => cameraOf(p.identity))
  if (talker) lastSpeaker.current = talker.identity
  const screens = live.filter((r) => r.source === Track.Source.ScreenShare)
  const screen = screens.find((r) => r.participant.isLocal) ?? screens[0]
  const speakerCam =
    cameraOf(lastSpeaker.current) ??
    cameraOf(room.localParticipant.identity) ??
    live.find((r) => r.source === Track.Source.Camera)

  let layout: StageLayout
  if (screen) {
    const bubble = cameraOf(lastSpeaker.current) ?? cameraOf(screen.participant.identity)
    layout = {
      main: screen.publication!.track!.mediaStreamTrack,
      mainFit: 'contain',
      bubble: bubble?.publication?.track?.mediaStreamTrack ?? null,
      label: bubble ? displayName(bubble.participant) : displayName(screen.participant),
    }
  } else {
    layout = {
      main: speakerCam?.publication?.track?.mediaStreamTrack ?? null,
      mainFit: 'cover',
      label: speakerCam ? displayName(speakerCam.participant) : null,
    }
  }
  const audio = refs
    .filter((r) => r.source === Track.Source.Microphone || r.source === Track.Source.ScreenShareAudio)
    .map((r) => r.publication?.track?.mediaStreamTrack)
    .filter((t): t is MediaStreamTrack => !!t)

  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const audioRef = useRef(audio)
  audioRef.current = audio

  useEffect(() => {
    const a = active.current
    if (!a) return
    a.rec.setLayout(layout)
    a.rec.setAudioTracks(audio)
  })

  // ── Stop and save ─────────────────────────────────────────────────────────
  const finish = useCallback(
    async (endedByLeaving: boolean) => {
      const a = active.current
      if (!a) return
      active.current = null
      setPhase('stopping')
      // Take the badge down first: the room should never be told it is still
      // being recorded after it isn't.
      room.localParticipant.setAttributes({ [RECORDING_ATTRIBUTE]: '' }).catch(() => {})
      const text = copyRef.current
      try {
        const res = await a.rec.stop()
        let file: Blob
        if (a.device) {
          file = await a.device.getFile()
          const withLength = await withWebmDuration(file, res.durationMs)
          if (withLength !== file) {
            try {
              await a.device.replace(withLength)
              file = await a.device.getFile()
            } catch (err) {
              console.warn('Could not write the recording length into the file', err)
            }
          }
        } else {
          file = await withWebmDuration(res.blob ?? new Blob([], { type: res.mimeType }), res.durationMs)
          // The stage is closing under it: nothing will be left on screen to
          // offer a Download from, so save it now (never discard a take).
          if (endedByLeaving) downloadBlob(file, a.fileName)
        }
        putFinishedRecording({
          slug,
          file,
          fileName: a.fileName,
          mimeType: res.mimeType,
          bytes: file.size || res.bytes,
          durationMs: res.durationMs,
          endedByLeaving,
        })
        setUploaded(false)
        setTake({ file, fileName: a.fileName, saved: !!a.device || endedByLeaving })
        if (endedByLeaving) setNote(text.savedAfterLeaving)
        else if (a.device) setNote(fill(text.saved, { size: formatMegabytes(file.size || res.bytes) }))
        else setNote(fill(STOP_EN.ready, { size: formatMegabytes(file.size || res.bytes) }))
      } catch (err) {
        console.error('Recording could not be saved', err)
        setError(text.saveFailed)
      } finally {
        setPhase('idle')
      }
    },
    [room, slug],
  )

  // The stage is closing (left, ended, disconnected): finish and save.
  useEffect(() => () => void finish(true), [finish])

  // A take that exists only in this tab (not downloaded, not uploaded) is worth
  // a "Leave site?" prompt too.
  const unsavedTake = !!take && !take.saved && !uploaded
  useEffect(() => {
    if (!unsavedTake) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [unsavedTake])

  // A recording in progress is worth a "Leave site?" prompt.
  useEffect(() => {
    if (phase !== 'recording') return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    const t = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.clearInterval(t)
    }
  }, [phase])

  async function start() {
    setError(null)
    setNote(null)
    if (unsavedTake && !window.confirm(STOP_EN.discardConfirm)) return
    setTake(null)
    upload.setMessage(null)
    if (!supportsSessionRecording()) {
      setError(copy.unsupported)
      return
    }
    setPhase('starting')
    const mime = pickRecordingMime()
    const fileName = recordingFileName(title, recordingExtension(mime))
    let device: DeviceFile | null = null
    try {
      // First, while the click still counts: where should it be saved?
      device = await openDeviceFile(fileName, baseMime(mime))
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') {
        setPhase('idle')
        return
      }
      device = null // no picker after all: keep it in memory, download at the end
    }
    try {
      const rec = new SessionRecorder({
        title,
        sink: device?.sink,
        onError: () => void finish(false),
      })
      rec.setLayout(layoutRef.current)
      rec.setAudioTracks(audioRef.current)
      await rec.start()
      active.current = { rec, device, fileName }
      try {
        // Consent: if the room can't be told, don't record.
        await room.localParticipant.setAttributes({ [RECORDING_ATTRIBUTE]: 'local' })
      } catch (err) {
        active.current = null
        await rec.stop().catch(() => {})
        throw err
      }
      setPhase('recording')
    } catch (err) {
      console.error('Recording could not start', err)
      setError(copy.startFailed)
      setPhase('idle')
    }
  }

  // ── Cloud (off unless the server says otherwise) ──────────────────────────
  const [cloud, setCloud] = useState<CloudStatus | null>(null)
  const [cloudBusy, setCloudBusy] = useState(false)
  useEffect(() => {
    if (!manageToken) return
    let alive = true
    cloudStatus(slug, manageToken)
      .then((s) => alive && setCloud(s))
      .catch(() => alive && setCloud(null))
    return () => {
      alive = false
    }
  }, [slug, manageToken])
  const cloudAvailable = !!cloud?.enabled && !!cloud.configured

  async function toggleCloud() {
    if (!manageToken || !cloud) return
    setCloudBusy(true)
    setError(null)
    try {
      if (cloud.active) {
        await stopCloudRecording(slug, manageToken)
        setCloud({ ...cloud, active: false })
      } else {
        await startCloudRecording(slug, manageToken)
        setCloud({ ...cloud, active: true })
      }
    } catch (err) {
      setError((err as Error).message === 'paid_only' ? copy.cloudPaidOnly : copy.cloudFailed)
    } finally {
      setCloudBusy(false)
    }
  }

  const a = active.current
  return (
    <div className="mt-3 space-y-2" data-testid="record-control">
      <div className="flex flex-wrap items-center gap-2">
        {phase === 'recording' || phase === 'stopping' ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={phase === 'stopping'}
            onClick={() => void finish(false)}
          >
            {phase === 'stopping' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            {copy.stop}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={phase === 'starting' || !connected}
            onClick={() => void start()}
          >
            {phase === 'starting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Circle className="h-4 w-4 fill-red-600 text-red-600" />
            )}
            {phase === 'starting' ? copy.starting : copy.record}
          </Button>
        )}
        {phase === 'recording' && a && (
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300" aria-live="off">
            {formatDuration(a.rec.elapsedMs)} · {formatMegabytes(a.rec.bytes)}
          </span>
        )}
        {cloudAvailable && (
          <Button
            type="button"
            size="sm"
            variant={cloud?.active ? 'destructive' : 'outline'}
            disabled={cloudBusy || !cloud?.entitled}
            title={!cloud?.entitled ? copy.cloudPaidOnly : copy.cloudHint}
            onClick={() => void toggleCloud()}
          >
            {cloudBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            {cloud?.active ? copy.cloudStop : copy.cloudRecord}
          </Button>
        )}
      </div>
      {phase === 'idle' && !note && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.recordHint}</p>
      )}
      {cloudAvailable && !cloud?.entitled && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.cloudPaidOnly}</p>
      )}
      {note && <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">{note}</p>}
      {take && phase === 'idle' && (
        <div className="space-y-2" data-testid="record-take">
          <div className="flex flex-wrap gap-2">
            {!take.saved && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  downloadBlob(take.file, take.fileName)
                  setTake({ ...take, saved: true })
                }}
              >
                <Download className="h-4 w-4" />
                {STOP_EN.download}
              </Button>
            )}
            {canUpload && !uploaded && !upload.paused && take.file.size <= MAX_REPLAY_BYTES && (
              <Button
                type="button"
                size="sm"
                disabled={upload.busy}
                onClick={() => void upload.start(take.file, take.fileName)}
              >
                {upload.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {upload.busy ? copy.uploading : copy.uploadReplay}
              </Button>
            )}
          </div>
          <ReplayUploadStatus upload={upload} />
          {uploaded && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">{copy.replayReady}</p>
          )}
          {upload.message && !upload.paused && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">{upload.message}</p>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </div>
  )
}
