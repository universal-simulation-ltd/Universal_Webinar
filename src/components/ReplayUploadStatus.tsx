import { Loader2, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UPLOAD_EN, progressText, type useReplayUpload } from '@/lib/useReplayUpload'

/** Progress bar while a replay uploads; Resume / Cancel once one has paused. */
export function ReplayUploadStatus({ upload }: { upload: ReturnType<typeof useReplayUpload> }) {
  const { busy, progress, paused, message } = upload
  if (busy && progress) {
    const pct = progress.total > 0 ? Math.min(100, (progress.stored / progress.total) * 100) : 0
    return (
      <div className="space-y-1" data-testid="replay-upload-progress">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.floor(pct)}
        >
          <div className="h-full bg-orange-600 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-slate-600 dark:text-slate-300" aria-live="polite">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progressText(progress)}
          </p>
          {progress.total > 50 * 1024 * 1024 && (
            <Button size="sm" variant="ghost" onClick={() => void upload.cancel()}>
              <X className="h-4 w-4" />
              {UPLOAD_EN.cancel}
            </Button>
          )}
        </div>
      </div>
    )
  }
  if (paused) {
    return (
      <div className="space-y-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3" data-testid="replay-upload-paused">
        {message && <p className="text-xs text-amber-900 dark:text-amber-200" role="alert">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={upload.resume}>
            <RotateCw className="h-4 w-4" />
            {UPLOAD_EN.resume}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void upload.cancel()}>
            <X className="h-4 w-4" />
            {UPLOAD_EN.cancel}
          </Button>
        </div>
      </div>
    )
  }
  return null
}
