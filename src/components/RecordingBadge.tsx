import { useEffect } from 'react'
import { ValueChip } from '@unisim/sdk'
import { useRoomRecording } from '@/lib/recordingSignal'
import { useRecordingCopy } from '@/lib/recordingCopy'

/** Lifts the room's recording state out of a <LiveKitRoom> to the page. */
export function RecordingWatcher({ onChange }: { onChange: (recording: boolean) => void }) {
  const recording = useRoomRecording()
  useEffect(() => {
    onChange(recording)
  }, [recording, onChange])
  useEffect(() => () => onChange(false), [onChange])
  return null
}

/**
 * The red "Recording" badge every participant sees while the session is being
 * recorded — the consent half of the feature, so it is never optional and never
 * hidden behind a setting.
 */
export function RecordingChip({ className }: { className?: string }) {
  const copy = useRecordingCopy()
  return (
    <span className={className} data-testid="recording-badge">
      <ValueChip tone="crit">
        <span aria-hidden className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-600" />
        {copy.badge}
      </ValueChip>
    </span>
  )
}
