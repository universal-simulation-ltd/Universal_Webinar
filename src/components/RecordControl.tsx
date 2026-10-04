import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnectionState, useRoomContext, useSpeakingParticipants, useTracks } from '@livekit/components-react'
import { ConnectionState, Track, type Participant } from 'livekit-client'
import { Circle, Cloud, Loader2, Square } from 'lucide-react'
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
import {
  cloudStatus,
  startCloudRecording,
  stopCloudRecording,
  type CloudStatus,
} from '@/lib/replay'

type Phase = 'idle' | 'starting' | 'recording' | 'stopping'

interface Active {
  rec: SessionRecorder
  device: DeviceFile | null
  fileName: string
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
 * Cloud recording shows only when the server says it is switched on; it is off
 * until the server's flag is switched on (the platform's webinar-recording function).
 */
export function RecordControl({
  slug,
  title,
  manageToken,
}: {
  slug: string
  title: string
  manageToken: string | null
}) {
  const copy = useRecordingCopy()
  const room = useRoomContext()
  const connected = useConnectionState() === ConnectionState.Connected
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const active = useRef<Active | null>(null)
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
          downloadBlob(file, a.fileName)
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
        setNote(endedByLeaving ? text.savedAfterLeaving : fill(text.saved, { size: formatMegabytes(file.size || res.bytes) }))
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
      {error && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
    </div>
  )
}
