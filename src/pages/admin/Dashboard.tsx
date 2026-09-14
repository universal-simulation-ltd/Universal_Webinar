import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Check, Copy, Loader2, Plus, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NewWebinarDialog } from '@/components/NewWebinarDialog'
import { listWebinars } from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import type { WebinarRow } from '@/lib/database.types'

export function AdminDashboard() {
  const navigate = useNavigate()
  const [webinars, setWebinars] = useState<WebinarRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setWebinars(await listWebinars())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load webinars.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Your webinars
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Schedule a new room, or jump back into one that's live.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New webinar
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : webinars.length === 0 ? (
        <EmptyState onCreate={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {webinars.map((w) => (
            <WebinarCard key={w.id} webinar={w} />
          ))}
        </div>
      )}

      <NewWebinarDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(created) => {
          setDialogOpen(false)
          navigate(`/admin/w/${created.slug}`)
        }}
      />
    </div>
  )
}

function WebinarCard({ webinar }: { webinar: WebinarRow }) {
  const when = formatSchedule(webinar)
  const [copied, setCopied] = useState(false)

  async function copyShareLink() {
    const url = `${window.location.origin}/w/${webinar.slug}/register`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{webinar.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1.5">
              {webinar.status === 'live' ? (
                <Radio className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
              {when}
            </CardDescription>
          </div>
          {webinar.status === 'live' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
              LIVE
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">/{webinar.slug}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Share'}
          </Button>
          <Button asChild size="sm">
            <Link to={`/admin/w/${webinar.slug}`}>
              {webinar.status === 'live' ? 'Control room' : 'Manage'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-16 text-center">
      <div>
        <p className="text-base font-medium text-slate-900 dark:text-slate-100">
          No webinars yet.
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create your first room to share with your audience.
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          New webinar
        </Button>
      </div>
    </div>
  )
}

function formatSchedule(w: WebinarRow): string {
  if (w.status === 'live') return 'Live now'
  if (w.status === 'ended') return 'Ended'
  if (!w.scheduled_at) return 'Not scheduled'
  return new Date(w.scheduled_at).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
