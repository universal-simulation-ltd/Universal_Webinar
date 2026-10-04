import { useSyncExternalStore } from 'react'
import type { RecordingSink } from './sessionRecorder'

// The host's finished recording, kept in memory for the rest of the visit.
//
// The recorder lives inside the host's LiveKit stage, which unmounts the moment
// they leave the stage or press End webinar (which navigates to the wrap-up).
// The file is already on their device by then; this is what lets the wrap-up
// page offer "Upload as replay" for it without asking them to find it again.
// A reload forgets it — the wrap-up page also takes the file from disk.

export interface FinishedRecording {
  slug: string
  file: Blob
  fileName: string
  mimeType: string
  bytes: number
  durationMs: number
  /** True when the stage closed under a running recording (left / ended). */
  endedByLeaving: boolean
}

const finished = new Map<string, FinishedRecording>()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function putFinishedRecording(rec: FinishedRecording): void {
  finished.set(rec.slug, rec)
  emit()
}

export function forgetFinishedRecording(slug: string): void {
  if (finished.delete(slug)) emit()
}

export function useFinishedRecording(slug: string): FinishedRecording | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => finished.get(slug) ?? null,
  )
}

/** `Product launch 2026-10-04 14-05.mp4` — readable, sortable, filesystem-safe. */
export function recordingFileName(title: string | null | undefined, ext: string, at = new Date()): string {
  const safe = Array.from(title ?? 'Webinar')
    // Control characters out, and the characters no filesystem allows.
    .map((ch) => (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch) ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'Webinar'
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}-${pad(at.getMinutes())}`
  return `${safe} ${stamp}.${ext}`
}

/** Save a Blob through the browser's download, for browsers with no file picker. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Long enough for the download to take the bytes.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts: {
    suggestedName?: string
    types?: { description?: string; accept: Record<string, string[]> }[]
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>
      close: () => Promise<void>
      abort?: () => Promise<void>
    }>
    getFile: () => Promise<File>
  }>
}

export interface DeviceFile {
  sink: RecordingSink
  /** The finished file, read back once the sink is closed. */
  getFile: () => Promise<File>
  /** Rewrite the whole file (used to add a WebM's length once it is known). */
  replace: (data: Blob) => Promise<void>
}

/**
 * Ask where to save, and stream the recording there as it is made (Chrome and
 * Edge on a computer). Returns null when the browser has no file picker — the
 * caller keeps the chunks and downloads them at the end — and throws an
 * AbortError when the host cancels the picker. Must run inside the click.
 */
export async function openDeviceFile(fileName: string, mime: string): Promise<DeviceFile | null> {
  const picker = (window as unknown as SaveFilePickerWindow).showSaveFilePicker
  if (typeof picker !== 'function' || window.self !== window.top) return null
  const ext = fileName.split('.').pop() ?? 'mp4'
  const handle = await picker.call(window, {
    suggestedName: fileName,
    types: [{ description: 'Video', accept: { [mime]: [`.${ext}`] } }],
  })
  const writable = await handle.createWritable()
  return {
    sink: {
      write: (chunk) => writable.write(chunk),
      close: () => writable.close(),
      abort: writable.abort ? () => writable.abort!() : undefined,
    },
    getFile: () => handle.getFile(),
    replace: async (data) => {
      // Written to a swap file and moved into place on close, so `data` may be
      // a slice of the file being replaced.
      const w = await handle.createWritable()
      await w.write(data)
      await w.close()
    },
  }
}
