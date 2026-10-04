// Record a webinar in the host's own browser: free, offline, nothing uploaded.
//
// The room is composited onto a canvas — the screen share (or the active
// speaker's camera) full-frame, with the speaker's camera as a bubble over a
// screen share, the way guests see it — and every microphone in the room is
// mixed through Web Audio. MediaRecorder encodes the result. With the File
// System Access API (Chrome, Edge) each chunk goes straight to the file the host
// picked, so an hour-long session never sits in memory; elsewhere the chunks are
// kept and downloaded at the end.
//
// No React and no LiveKit in here: the caller hands over plain
// MediaStreamTracks (setLayout / setAudioTracks), which is what lets the
// Playwright test drive it with fake devices.

/** What the recording should show right now. */
export interface StageLayout {
  /** Full-frame video: the screen share, else the active speaker's camera. */
  main?: MediaStreamTrack | null
  /** 'contain' for a screen share (never crop a slide), 'cover' for a camera. */
  mainFit?: 'contain' | 'cover'
  /** A camera drawn as a bubble over a screen share. */
  bubble?: MediaStreamTrack | null
  /** Who is on screen, drawn bottom-left. Omitted when unknown. */
  label?: string | null
}

/** Where finished chunks go instead of memory (a FileSystemWritableFileStream). */
export interface RecordingSink {
  write(chunk: Blob): Promise<void>
  close(): Promise<void>
  abort?(): Promise<void>
}

export interface SessionRecorderOptions {
  width?: number
  height?: number
  fps?: number
  videoBitsPerSecond?: number
  audioBitsPerSecond?: number
  /** Drawn while nothing is on stage. */
  title?: string
  sink?: RecordingSink | null
  /** The encoder or the sink failed; the recording has stopped. */
  onError?: (err: Error) => void
}

export interface RecordingResult {
  /** The whole recording, unless it was streamed to a sink. */
  blob: Blob | null
  mimeType: string
  bytes: number
  durationMs: number
}

/**
 * A frame clock that keeps ticking when the tab is hidden — the approach from
 * Universal Recorder's PiP compositor (bedc25c). requestAnimationFrame stops
 * the moment the page is hidden, and main-thread timers are throttled to once a
 * second or slower, so a host who switches to their slides would freeze the
 * recording for exactly as long as they present. A dedicated worker's timers are
 * not throttled and its messages still reach a hidden page. Falls back to rAF.
 */
export function startFrameClock(fps: number, onTick: () => void): () => void {
  try {
    const src = `setInterval(function(){postMessage(0)},${Math.round(1000 / fps)})`
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    const worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = () => onTick()
    return () => worker.terminate()
  } catch {
    let raf = 0
    const loop = () => {
      onTick()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }
}

/**
 * WebM first, MP4 where WebM can't be made (Safari).
 *
 * ⚠️ Not the Universal Recorder's order, on purpose. Chrome's MP4 MediaRecorder
 * hands over NOTHING until it stops (measured 2026-10-04: no chunks at all
 * during a 3.5 s take, everything at stop), so an hour of webinar would sit in
 * memory and a crash would lose all of it. WebM arrives every second and
 * streams to the file as it goes. VP8 before VP9: this runs live beside a video
 * call, and VP9 costs far more CPU to encode. The file's length is written in
 * afterwards (webmDuration.ts) so players can seek it.
 */
export function pickRecordingMime(): string {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export function recordingExtension(mime: string): 'mp4' | 'webm' {
  return mime.startsWith('video/mp4') ? 'mp4' : 'webm'
}

/** The base type, without codecs — what a file picker and a Blob want. */
export function baseMime(mime: string): string {
  return (mime.split(';')[0] || 'video/webm').trim()
}

export function supportsSessionRecording(): boolean {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return false
  const canvas = document.createElement('canvas')
  const hasCapture = typeof (canvas as HTMLCanvasElement & { captureStream?: unknown }).captureStream === 'function'
  const hasAudio = typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) === 'function'
  return hasCapture && hasAudio && pickRecordingMime() !== ''
}

type AudioCtor = typeof AudioContext

export class SessionRecorder {
  private readonly opts: Required<Omit<SessionRecorderOptions, 'sink' | 'onError' | 'title'>> &
    Pick<SessionRecorderOptions, 'sink' | 'onError' | 'title'>
  private canvas = document.createElement('canvas')
  private ctx2d: CanvasRenderingContext2D
  private videos = new Map<string, HTMLVideoElement>()
  private layout: StageLayout = {}
  private stopClock: () => void = () => {}
  private audioCtx: AudioContext
  private destination: MediaStreamAudioDestinationNode
  private audioInputs = new Map<string, { source: MediaStreamAudioSourceNode; el: HTMLAudioElement }>()
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private writeChain: Promise<void> = Promise.resolve()
  private writeError: Error | null = null
  private canvasStream: MediaStream | null = null
  private startedAt = 0
  private stoppedAt = 0
  private byteCount = 0
  private mime = ''

  constructor(options: SessionRecorderOptions = {}) {
    this.opts = {
      width: options.width ?? 1280,
      height: options.height ?? 720,
      fps: options.fps ?? 30,
      // ~1.1 Mbit/s all in: about 500 MB an hour. Plenty for slides and
      // talking heads at 720p.
      videoBitsPerSecond: options.videoBitsPerSecond ?? 1_000_000,
      audioBitsPerSecond: options.audioBitsPerSecond ?? 96_000,
      title: options.title,
      sink: options.sink ?? null,
      onError: options.onError,
    }
    this.canvas.width = this.opts.width
    this.canvas.height = this.opts.height
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.ctx2d = ctx
    const Ctor: AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioCtor }).webkitAudioContext
    this.audioCtx = new Ctor()
    this.destination = this.audioCtx.createMediaStreamDestination()
  }

  get mimeType(): string { return this.mime }
  get bytes(): number { return this.byteCount }
  get recording(): boolean { return this.recorder?.state === 'recording' }
  get elapsedMs(): number {
    if (!this.startedAt) return 0
    return (this.stoppedAt || performance.now()) - this.startedAt
  }

  /** Begin recording. Call from a click (it resumes the AudioContext). */
  async start(): Promise<void> {
    if (this.recorder) throw new Error('Already recording')
    this.mime = pickRecordingMime()
    if (!this.mime) throw new Error('This browser cannot record video')
    await this.audioCtx.resume().catch(() => {})

    this.draw()
    this.canvasStream = this.canvas.captureStream(this.opts.fps)
    this.stopClock = startFrameClock(this.opts.fps, this.draw)

    const stream = new MediaStream([
      ...this.canvasStream.getVideoTracks(),
      ...this.destination.stream.getAudioTracks(),
    ])
    const recorder = new MediaRecorder(stream, {
      mimeType: this.mime,
      videoBitsPerSecond: this.opts.videoBitsPerSecond,
      audioBitsPerSecond: this.opts.audioBitsPerSecond,
    })
    recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return
      this.byteCount += e.data.size
      const sink = this.opts.sink
      if (sink) {
        // In order, one at a time: a writable stream is not re-entrant.
        this.writeChain = this.writeChain.then(() => sink.write(e.data)).catch((err) => {
          if (!this.writeError) {
            this.writeError = err instanceof Error ? err : new Error(String(err))
            this.opts.onError?.(this.writeError)
            if (recorder.state !== 'inactive') recorder.stop()
          }
        })
      } else {
        this.chunks.push(e.data)
      }
    }
    recorder.onerror = (ev) => {
      const err = (ev as unknown as { error?: Error }).error ?? new Error('Recording failed')
      this.opts.onError?.(err)
    }
    this.recorder = recorder
    // One-second chunks: a crash loses at most a second of what was written.
    recorder.start(1000)
    this.startedAt = performance.now()
  }

  setLayout(layout: StageLayout): void {
    this.layout = layout
    const keep = new Set<string>()
    for (const t of [layout.main, layout.bubble]) {
      if (!t) continue
      keep.add(t.id)
      if (!this.videos.has(t.id)) {
        const v = document.createElement('video')
        v.muted = true
        v.playsInline = true
        v.autoplay = true
        v.srcObject = new MediaStream([t])
        void v.play().catch(() => {})
        this.videos.set(t.id, v)
      }
    }
    for (const [id, v] of this.videos) {
      if (!keep.has(id)) {
        v.srcObject = null
        this.videos.delete(id)
      }
    }
  }

  /** Every audio track that should be heard; anything left out is dropped. */
  setAudioTracks(tracks: MediaStreamTrack[]): void {
    const want = new Map(tracks.filter((t) => t.kind === 'audio').map((t) => [t.id, t]))
    for (const [id, input] of this.audioInputs) {
      if (!want.has(id)) {
        input.source.disconnect()
        input.el.srcObject = null
        this.audioInputs.delete(id)
      }
    }
    for (const [id, track] of want) {
      if (this.audioInputs.has(id)) continue
      const stream = new MediaStream([track])
      // ⚠️ Chrome feeds a REMOTE WebRTC track into Web Audio as silence unless
      // the same stream is also attached to a media element. Muted is enough.
      const el = document.createElement('audio')
      el.muted = true
      el.srcObject = stream
      void el.play().catch(() => {})
      const source = this.audioCtx.createMediaStreamSource(stream)
      source.connect(this.destination)
      this.audioInputs.set(id, { source, el })
    }
  }

  private readyVideo(track: MediaStreamTrack | null | undefined): HTMLVideoElement | null {
    if (!track || track.readyState !== 'live') return null
    const v = this.videos.get(track.id)
    if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight) return null
    return v
  }

  private draw = (): void => {
    const ctx = this.ctx2d
    const W = this.canvas.width
    const H = this.canvas.height
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    const main = this.readyVideo(this.layout.main)
    if (main) {
      const fit = this.layout.mainFit ?? 'contain'
      const scale =
        fit === 'cover'
          ? Math.max(W / main.videoWidth, H / main.videoHeight)
          : Math.min(W / main.videoWidth, H / main.videoHeight)
      const w = main.videoWidth * scale
      const h = main.videoHeight * scale
      ctx.drawImage(main, (W - w) / 2, (H - h) / 2, w, h)
    } else if (this.opts.title) {
      ctx.fillStyle = '#e2e8f0'
      ctx.font = `600 ${Math.round(H / 18)}px system-ui, -apple-system, Segoe UI, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(this.opts.title.slice(0, 80), W / 2, H / 2, W * 0.9)
    }

    const bubble = this.readyVideo(this.layout.bubble)
    if (bubble && main) {
      const bw = Math.round(W * 0.22)
      const bh = Math.round(bw * (bubble.videoHeight / bubble.videoWidth))
      const m = Math.round(W * 0.02)
      const x = W - bw - m
      const y = H - bh - m
      const r = Math.round(bw * 0.06)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, bw, bh, r)
      ctx.clip()
      const s = Math.max(bw / bubble.videoWidth, bh / bubble.videoHeight)
      const dw = bubble.videoWidth * s
      const dh = bubble.videoHeight * s
      ctx.drawImage(bubble, x + (bw - dw) / 2, y + (bh - dh) / 2, dw, dh)
      ctx.restore()
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, bw, bh, r)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.stroke()
      ctx.restore()
    }

    const label = this.layout.label?.trim()
    if (label && main) {
      const fs = Math.round(H / 32)
      ctx.font = `600 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const text = label.slice(0, 60)
      const padX = fs * 0.6
      const w = ctx.measureText(text).width + padX * 2
      const h = fs * 1.8
      const x = Math.round(W * 0.02)
      const y = H - h - Math.round(W * 0.02)
      ctx.fillStyle = 'rgba(15,23,42,0.75)'
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, h / 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(text, x + padX, y + h / 2)
    }
  }

  /** Stop, flush every chunk (to the sink, if any) and release everything. */
  async stop(): Promise<RecordingResult> {
    const recorder = this.recorder
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true })
        recorder.stop()
      })
    }
    this.stoppedAt = this.stoppedAt || performance.now()
    this.stopClock()
    this.canvasStream?.getTracks().forEach((t) => t.stop())
    for (const v of this.videos.values()) v.srcObject = null
    this.videos.clear()
    this.setAudioTracks([])
    await this.audioCtx.close().catch(() => {})

    await this.writeChain
    const sink = this.opts.sink
    if (sink) {
      if (this.writeError) await sink.abort?.().catch(() => {})
      else await sink.close()
    }
    if (this.writeError) throw this.writeError
    const type = baseMime(this.mime)
    return {
      blob: sink ? null : new Blob(this.chunks, { type }),
      mimeType: type,
      bytes: this.byteCount,
      durationMs: this.elapsedMs,
    }
  }
}
