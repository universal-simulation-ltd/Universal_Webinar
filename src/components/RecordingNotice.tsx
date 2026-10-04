import { useRecordingCopy } from '@/lib/recordingCopy'

/** "Sessions may be recorded" — told before anyone joins, in their language. */
export function RecordingNotice() {
  const copy = useRecordingCopy()
  return (
    <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400" data-testid="recording-notice">
      {copy.joinNotice}
    </p>
  )
}
