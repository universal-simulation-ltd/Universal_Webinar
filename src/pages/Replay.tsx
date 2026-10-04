import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, Loader2, PlayCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { isReplayId, playReplay, type PlayableReplay } from '@/lib/replay'
import { fill, useRecordingCopy } from '@/lib/recordingCopy'

/**
 * The replay link from the follow-up email: `/replay/<id>`.
 *
 * The id is the credential (see lib/replay.ts) — nobody needs an account or a
 * registration to watch, exactly as with a link the host pasted. The video URL
 * the function hands back lasts six hours; opening the page again gets a new one.
 */
export function Replay() {
  const { id = '' } = useParams()
  const copy = useRecordingCopy()
  const [replay, setReplay] = useState<PlayableReplay | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    setReplay(null)
    setMissing(false)
    if (!isReplayId(id)) {
      setMissing(true)
      return
    }
    playReplay(id.toLowerCase())
      .then((r) => alive && setReplay(r))
      .catch(() => alive && setMissing(true))
    return () => {
      alive = false
    }
  }, [id])

  return (
    <div className="container max-w-3xl py-8">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <PlayCircle className="h-3.5 w-3.5" />
        {copy.replayTitle}
      </p>
      {replay?.title && (
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {replay.title}
        </h1>
      )}
      {replay?.host_label && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {fill(copy.replayBy, { host: replay.host_label })}
        </p>
      )}

      <div className="mt-5">
        {replay ? (
          <video
            data-testid="replay-video"
            src={replay.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-2xl bg-black shadow-soft"
          />
        ) : missing ? (
          <Card>
            <CardContent className="flex items-start gap-2 p-6 text-sm text-slate-700 dark:text-slate-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              {copy.replayMissing}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400" role="status">
            <Loader2 className="h-5 w-5 animate-spin" />
            {copy.replayLoading}
          </div>
        )}
      </div>
    </div>
  )
}
