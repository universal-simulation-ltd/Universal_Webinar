import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CloudUpload,
  Download,
  Loader2,
  TrendingUp,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  archiveWebinarByToken,
  getWebinarAttendanceByToken,
  getWebinarStatsByToken,
  listRegistrationsByToken,
  type WebinarStats,
} from '@/lib/db'
import {
  getWebinarByManageToken,
  recallManageToken,
  updateWebinarByToken,
} from '@/lib/host'
import {
  buildRegistrationsCsv,
  downloadCsv,
  registrationsCsvFilename,
} from '@/lib/csv'
import { getErrorMessage } from '@/lib/errors'
import { formatWithZone, localTimezone } from '@/lib/time'
import { parseQuestions } from '@/lib/customQuestions'
import type {
  AttendanceRow,
  RegistrationRow,
  WebinarRow,
} from '@/lib/database.types'

/**
 * Where a host lands after ending a webinar.
 *
 * Everything here is a post-session concern that was previously mixed into the
 * live control column: the recording link, the numbers, taking the data out,
 * and deciding what happens to the webinar now. Splitting it out means the
 * during-the-session page isn't carrying cards nobody can use yet, and the
 * after-the-session decisions get room to be explained properly — they are the
 * ones that destroy data or tie up a token.
 */
export function HostWrapUp() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  // Storage first, but honour ?token= as well: a host who opens this on a
  // second device, or straight from the link in their confirmation email, has
  // nothing in localStorage and would otherwise hit a dead end here.
  const token = useMemo(
    () => recallManageToken(slug) ?? params.get('token'),
    [slug, params],
  )

  const [webinar, setWebinar] = useState<WebinarRow | null>(null)
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [stats, setStats] = useState<WebinarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [exported, setExported] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        if (!token) {
          setError(
            'We need your manage link to show this. Open the webinar from the link you were given, then come back.',
          )
          return
        }
        const w = await getWebinarByManageToken(slug, token)
        if (!active) return
        if (!w) {
          setError(`No webinar found for "${slug}".`)
          return
        }
        setWebinar(w)
        const regs = await listRegistrationsByToken(slug, token)
        if (active) setRegistrations(regs)
        // Both are extras — the page is still worth showing without them.
        try {
          const s = await getWebinarStatsByToken(slug, token)
          if (active) setStats(s)
        } catch { /* no summary */ }
        try {
          const a = await getWebinarAttendanceByToken(slug, token)
          if (active) setAttendance(a)
        } catch { /* no attendance detail */ }
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Could not load the wrap-up.'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slug, token])

  async function patch(update: Parameters<typeof updateWebinarByToken>[2], label: string) {
    if (!webinar || !token) return
    setSaving(label)
    try {
      setWebinar(await updateWebinarByToken(webinar.slug, token, update))
    } catch (err) {
      setError(getErrorMessage(err, 'That did not save.'))
    } finally {
      setSaving(null)
    }
  }

  function exportCsv() {
    if (!webinar) return
    setExported(true)
    downloadCsv(
      buildRegistrationsCsv(
        registrations,
        parseQuestions(webinar.custom_questions),
        attendance,
      ),
      registrationsCsvFilename(webinar),
    )
  }

  async function closeAndFree() {
    if (!webinar || !token) return
    setSaving('close')
    try {
      setWebinar(await archiveWebinarByToken(webinar.slug, token))
      setConfirmClose(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not close the webinar.'))
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !webinar) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-700">{error}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to={`/host/w/${slug}`}>Back to the webinar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kept = !!webinar.kept_at
  const closed = !!webinar.archived_at

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {webinar.company_name ?? 'Wrap-up'}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {webinar.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {webinar.ended_at
            ? `Ended ${formatWithZone(new Date(webinar.ended_at), localTimezone())}.`
            : 'That’s a wrap.'}{' '}
          <Link
            to={`/host/w/${webinar.slug}`}
            className="underline underline-offset-2"
          >
            Back to the webinar
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        {/* How it went ------------------------------------------------------ */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                How it went
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  { k: 'Registered', v: stats.registered },
                  { k: 'Turned up', v: stats.attended },
                  { k: 'No-shows', v: stats.no_show },
                ].map(({ k, v }) => (
                  <div key={k} className="rounded-lg bg-slate-50 py-3">
                    <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                      {k}
                    </dt>
                    <dd className="text-xl font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              {stats.registered > 0 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  {Math.round((stats.attended / stats.registered) * 100)}% of
                  registrants attended
                  {stats.waitlisted > 0 &&
                    ` · ${stats.waitlisted} never got a seat`}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recording -------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-slate-500" />
              Recording
            </CardTitle>
            <CardDescription>
              Paste the link and it goes out in the follow-up email to everyone
              who registered — including the people who missed it, which is
              usually who wants it most.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="https://…"
                defaultValue={webinar.recording_url ?? ''}
                disabled={saving === 'recording_url'}
                aria-label="Recording link"
                onBlur={(e) => {
                  const next = e.target.value.trim() || null
                  if (next === (webinar.recording_url ?? null)) return
                  void patch({ recording_url: next }, 'recording_url')
                }}
              />
              {saving === 'recording_url' && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>
            {!webinar.send_followup && (
              <p className="mt-2 text-xs text-amber-700">
                Follow-up emails are switched off, so this link won't reach
                anyone. Turn them back on under Communication.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Take your data --------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-slate-500" />
              Take your list
            </CardTitle>
            <CardDescription>
              Names, emails, answers, who turned up and anyone who walked in
              without registering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              disabled={registrations.length === 0 && attendance.length === 0}
              onClick={exportCsv}
            >
              {exported ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exported ? 'Exported' : 'Export CSV'}
            </Button>
          </CardContent>
        </Card>

        {/* What happens to it now ------------------------------------------- */}
        <Card className={closed ? 'border-slate-300 bg-slate-50' : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-slate-500" />
              Finished with this webinar?
            </CardTitle>
            <CardDescription>
              {closed ? (
                webinar.purge_after ? (
                  <>
                    Closed, and your token is back. This webinar and its
                    registrations are deleted on{' '}
                    <strong>
                      {formatWithZone(
                        new Date(webinar.purge_after),
                        localTimezone(),
                      )}
                    </strong>
                    . Upgrade before then to keep the history.
                  </>
                ) : (
                  <>Closed, and your token is back. Your history is kept.</>
                )
              ) : (
                <>
                  Two ways to go. Keep it and your token stays with it; close it
                  and the token comes back for your next webinar.
                </>
              )}
            </CardDescription>
          </CardHeader>

          {!closed && (
            <CardContent className="space-y-3">
              {kept ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-medium">
                      Saved to the cloud
                      {webinar.kept_at &&
                        ` on ${formatWithZone(new Date(webinar.kept_at), localTimezone())}`}
                      .
                    </p>
                    <p className="mt-0.5">
                      This webinar and everyone in it are kept for as long as you
                      want them. Your token stays held, so you can't start
                      another webinar until you close this one below.
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={saving === 'kept_at'}
                  onClick={() =>
                    void patch({ kept_at: new Date().toISOString() }, 'kept_at')
                  }
                >
                  {saving === 'kept_at' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  Save to cloud — keep it all
                </Button>
              )}

              {!kept && (
                <p className="text-xs text-slate-500">
                  Keeping it holds onto your webinar token, so you won't be able
                  to run another until you release it. Nothing is deleted while
                  it's saved.
                </p>
              )}

              {registrations.length > 0 && !exported && !kept && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    You haven't exported your {registrations.length}{' '}
                    {registrations.length === 1 ? 'registrant' : 'registrants'}{' '}
                    yet. Closing starts the 30-day clock on the free plan — take
                    the CSV above first.
                  </span>
                </div>
              )}

              {confirmClose ? (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-900">
                    Close “{webinar.title}”?
                  </p>
                  <p className="text-xs text-red-800">
                    Your token comes back straight away. On the free plan this
                    webinar and everyone in it are deleted 30 days later. This
                    can't be undone.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={saving === 'close'}
                      onClick={() => void closeAndFree()}
                    >
                      {saving === 'close' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Closing…
                        </>
                      ) : (
                        'Yes, close it'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={saving === 'close'}
                      onClick={() => setConfirmClose(false)}
                    >
                      Keep it open
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant={kept ? 'outline' : 'ghost'}
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmClose(true)}
                >
                  <Archive className="h-4 w-4" />
                  {kept ? 'Release my token & close' : 'Close & free my token'}
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
