import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  BellRing,
  Camera,
  Check,
  Copy,
  DoorClosed,
  DoorOpen,
  Download,
  Eye,
  EyeOff,
  Hand,
  Loader2,
  Lock,
  Mail,
  MonitorUp,
  Power,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  X,
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
import { OtpVerifyDialog } from '@/components/OtpVerifyDialog'
import { cn } from '@/lib/utils'
import {
  getWebinarBySlug,
  listRegistrationsByToken,
  sendRegistrationConfirmation,
  setRegistrationStatusByToken,
} from '@/lib/db'
import {
  getWebinarByManageToken,
  rememberManageToken,
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
import CustomQuestionsEditor from '@/components/CustomQuestionsEditor'
import {
  type CustomQuestion,
  parseQuestions,
} from '@/lib/customQuestions'
import type {
  RegistrationRow,
  RegistrationStatus,
  WebinarRow,
  WebinarUpdate,
} from '@/lib/database.types'

export function HostManage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()

  const initialToken = useMemo(
    () => params.get('token') ?? recallManageToken(slug),
    [params, slug],
  )

  const [token, setToken] = useState<string | null>(initialToken)
  const [webinar, setWebinar] = useState<WebinarRow | null>(null)
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [refreshingRegs, setRefreshingRegs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [openCopied, setOpenCopied] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  // Draft of the custom registration questions — edited locally, saved on demand
  // (unlike the room toggles, which save on each change).
  const [questionsDraft, setQuestionsDraft] = useState<CustomQuestion[]>([])
  // Which registration is mid-approve, so its buttons can disable individually
  // rather than freezing the whole panel.
  const [statusSaving, setStatusSaving] = useState<string | null>(null)

  // Sync the draft whenever the loaded webinar changes.
  const savedQuestions = useMemo(() => parseQuestions(webinar?.custom_questions), [webinar])
  useEffect(() => {
    setQuestionsDraft(savedQuestions)
  }, [savedQuestions])
  const approvedCount = useMemo(
    () => registrations.filter((r) => r.status === 'approved').length,
    [registrations],
  )
  const waitlistedCount = useMemo(
    () => registrations.filter((r) => r.status === 'waitlisted').length,
    [registrations],
  )
  // null capacity = unlimited, so there is no "seats left" to show.
  const seatsLeft = useMemo(
    () =>
      webinar?.capacity != null
        ? Math.max(webinar.capacity - approvedCount, 0)
        : null,
    [webinar, approvedCount],
  )
  const pendingCount = useMemo(
    () => registrations.filter((r) => r.status === 'pending').length,
    [registrations],
  )
  const questionsDirty = useMemo(
    () => JSON.stringify(questionsDraft) !== JSON.stringify(savedQuestions),
    [questionsDraft, savedQuestions],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // The token is verified server-side now (migration 0067) — it's the
        // authorisation, and the row it unlocks comes back in the same call.
        const w = token ? await getWebinarByManageToken(slug, token) : null
        if (!active) return
        if (!token || !w) {
          // No token, wrong token, or no such webinar. Fall back to the public
          // row so a locked-out host still sees which webinar they landed on.
          const publicRow = await getWebinarBySlug(slug)
          if (!active) return
          if (!publicRow) {
            setError(`No webinar found for "${slug}".`)
            return
          }
          setTokenInvalid(true)
          setWebinar(publicRow)
          return
        }
        rememberManageToken(slug, token)
        // Strip the token from the URL once we've persisted it, so the host
        // can copy the address bar URL without leaking edit access.
        if (params.get('token')) {
          const next = new URLSearchParams(params)
          next.delete('token')
          setParams(next, { replace: true })
        }
        setWebinar(w)
        const regs = await listRegistrationsByToken(w.slug, token)
        if (!active) return
        setRegistrations(regs)
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Load failed.'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slug, token, params, setParams])

  async function patch(update: WebinarUpdate, label: string) {
    if (!webinar || !token) return
    setSaving(label)
    try {
      const next = await updateWebinarByToken(webinar.slug, token, update)
      setWebinar(next)
    } catch (err) {
      setError(getErrorMessage(err, 'Update failed.'))
    } finally {
      setSaving(null)
    }
  }

  // Approve / waitlist / decline. Approving is also what releases the phase-4
  // confirmation email: send-webinar-confirmation defers on a gated webinar and
  // leaves confirmation_sent_at null, so this second call is the one that
  // actually delivers the join link.
  async function changeStatus(reg: RegistrationRow, next: RegistrationStatus) {
    if (!webinar || !token) return
    setStatusSaving(reg.id)
    try {
      const updated = await setRegistrationStatusByToken(
        webinar.slug,
        token,
        reg.id,
        next,
      )
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, ...updated } : r)),
      )
      if (next === 'approved') {
        const sent = await sendRegistrationConfirmation(webinar.id, reg.email)
        if (sent) {
          setRegistrations((prev) =>
            prev.map((r) =>
              r.id === reg.id
                ? { ...r, confirmation_sent_at: new Date().toISOString() }
                : r,
            ),
          )
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update that registration.'))
    } finally {
      setStatusSaving(null)
    }
  }

  async function reloadRegistrations() {
    if (!webinar || !token) return
    setRefreshingRegs(true)
    try {
      setRegistrations(await listRegistrationsByToken(webinar.slug, token))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not refresh registrations.'))
    } finally {
      setRefreshingRegs(false)
    }
  }

  function exportRegistrationsCsv() {
    if (!webinar || registrations.length === 0) return
    downloadCsv(
      buildRegistrationsCsv(registrations, savedQuestions),
      registrationsCsvFilename(webinar),
    )
  }

  function attemptGoLive() {
    if (!webinar) return
    if (!webinar.host_verified) {
      setVerifyOpen(true)
      return
    }
    void patch(
      {
        status: webinar.status === 'live' ? 'ended' : 'live',
        started_at:
          webinar.status !== 'live' && !webinar.started_at
            ? new Date().toISOString()
            : webinar.started_at,
        ended_at:
          webinar.status === 'live' ? new Date().toISOString() : null,
      },
      'status',
    )
  }

  function handleVerified(next: WebinarRow) {
    setWebinar(next)
    // Immediately flip to live after successful verification.
    void patch(
      {
        status: 'live',
        started_at: next.started_at ?? new Date().toISOString(),
        ended_at: null,
      },
      'status',
    )
  }

  async function copyOpenJoinLink() {
    if (!webinar) return
    await navigator.clipboard.writeText(
      `${window.location.origin}/w/${webinar.slug}`,
    )
    setOpenCopied(true)
    setTimeout(() => setOpenCopied(false), 1500)
  }

  async function copyShareLink() {
    if (!webinar) return
    const url = `${window.location.origin}/w/${webinar.slug}/register`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (tokenInvalid) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                We need your manage link
              </CardTitle>
              <CardDescription>
                The URL must include your management token. Paste the link from
                the address bar after you created the webinar (or from the
                confirmation email), or enter the token below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const t = String(fd.get('token') || '').trim()
                  if (t) {
                    setTokenInvalid(false)
                    setToken(t)
                  }
                }}
              >
                <input
                  name="token"
                  type="text"
                  placeholder="paste-your-manage-token"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
                <Button type="submit" className="w-full">
                  Open management view
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
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
              <Link to="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <OtpVerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        webinar={webinar}
        onVerified={handleVerified}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {webinar.logo_url && (
            <img
              src={webinar.logo_url}
              alt={webinar.company_name ?? ''}
              className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
            />
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {webinar.company_name ?? 'Host control'}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {webinar.title}{' '}
              <span className="text-slate-400">·</span>{' '}
              <span className="text-slate-500 text-base font-mono">
                /{webinar.slug}
              </span>
            </h1>
          </div>
        </div>
        <Button
          size="lg"
          variant={webinar.status === 'live' ? 'destructive' : 'default'}
          onClick={attemptGoLive}
          disabled={saving === 'status'}
        >
          {saving === 'status' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          {webinar.status === 'live' ? 'End webinar' : 'Go live'}
        </Button>
      </div>

      {!webinar.host_verified && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Your email isn't verified yet. You can edit the webinar and share
            the registration link freely; you just need a 6-digit code (sent
            to <strong>{webinar.host_email}</strong>) the first time you go
            live.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={copyShareLink}>
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? 'Copied!' : 'Copy registration link'}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/w/${webinar.slug}/register`} target="_blank">
            Open registration page ↗
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your stage</CardTitle>
              <CardDescription>
                Camera preview and broadcast controls. Wires up in Phase 4 with
                LiveKit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-xl bg-slate-900 grid place-items-center text-slate-300 text-sm">
                <div className="text-center">
                  <Camera className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="mt-2">Camera preview</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" disabled>
                  <Camera className="h-4 w-4" />
                  Test camera
                </Button>
                <Button variant="outline" disabled>
                  <MonitorUp className="h-4 w-4" />
                  Share screen
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hand className="h-4 w-4 text-slate-500" />
                Speaker queue
              </CardTitle>
              <CardDescription>
                Approve guests to share their camera and mic. (Phase 5.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                No pending requests yet.
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-500" />
                Room settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ToggleRow
                icon={
                  webinar.show_guest_count ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )
                }
                label="Show attendee count"
                hint="Guests see how many people are watching."
                checked={webinar.show_guest_count}
                disabled={saving === 'show_guest_count'}
                onChange={(next) =>
                  patch({ show_guest_count: next }, 'show_guest_count')
                }
              />
              <ToggleRow
                icon={<Hand className="h-4 w-4" />}
                label="Allow speaker requests"
                hint="Guests can request to join the conversation."
                checked={webinar.allow_speak_requests}
                disabled={saving === 'allow_speak_requests'}
                onChange={(next) =>
                  patch(
                    { allow_speak_requests: next },
                    'allow_speak_requests',
                  )
                }
              />
              <ToggleRow
                icon={<Mail className="h-4 w-4" />}
                label="Email registrants a confirmation"
                hint="Their own join link, plus a calendar invite when the session has a date."
                checked={webinar.send_confirmation}
                disabled={saving === 'send_confirmation'}
                onChange={(next) =>
                  patch({ send_confirmation: next }, 'send_confirmation')
                }
              />
              <ToggleRow
                icon={<UserCheck className="h-4 w-4" />}
                label="Approve registrants yourself"
                hint="New sign-ups wait for your OK before they get a join link."
                checked={webinar.require_approval}
                disabled={saving === 'require_approval'}
                onChange={(next) =>
                  patch({ require_approval: next }, 'require_approval')
                }
              />
              <ToggleRow
                icon={<BellRing className="h-4 w-4" />}
                label="Remind registrants before it starts"
                hint={
                  webinar.scheduled_at
                    ? 'A nudge the day before and again an hour ahead.'
                    : 'Set a date under Scheduled for — reminders need one.'
                }
                checked={webinar.send_reminders}
                disabled={saving === 'send_reminders'}
                onChange={(next) =>
                  patch({ send_reminders: next }, 'send_reminders')
                }
              />
              <ToggleRow
                icon={<Mail className="h-4 w-4" />}
                label="Email a follow-up afterwards"
                hint="Thanks to those who came, and a catch-up to those who missed it."
                checked={webinar.send_followup}
                disabled={saving === 'send_followup'}
                onChange={(next) =>
                  patch({ send_followup: next }, 'send_followup')
                }
              />
              <ToggleRow
                icon={<Lock className="h-4 w-4" />}
                label="PIN-lock the webinar"
                hint="Lands in Phase 6."
                checked={false}
                disabled
                onChange={() => {}}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-slate-500" />
                Open join link
              </CardTitle>
              <CardDescription>
                Share this anywhere — a newsletter beforehand, or drop it in
                chat during the session for people who never signed up. They
                give a name and email at the door.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                  {`${window.location.origin}/w/${webinar.slug}`}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyOpenJoinLink}
                  disabled={!webinar.open_join}
                >
                  {openCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {openCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <ToggleRow
                icon={
                  webinar.open_join ? (
                    <DoorOpen className="h-4 w-4" />
                  ) : (
                    <DoorClosed className="h-4 w-4" />
                  )
                }
                label={webinar.open_join ? 'Link is live' : 'Link is switched off'}
                hint={
                  webinar.open_join
                    ? 'Anyone with the link can walk in.'
                    : 'Walk-ups are blocked. People who already registered can still join with their own link.'
                }
                checked={webinar.open_join}
                disabled={saving === 'open_join'}
                onChange={(next) => patch({ open_join: next }, 'open_join')}
              />
              {webinar.require_approval && webinar.open_join && (
                <p className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                  You're approving registrants, so walk-ups are turned away
                  regardless — they'll be asked to register first.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-500" />
                Recording
              </CardTitle>
              <CardDescription>
                Paste the link once it's up — it goes out in the follow-up email
                to everyone who registered, including the people who missed it.
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
              {webinar.status !== 'ended' && (
                <p className="mt-2 text-xs text-slate-500">
                  The follow-up sends once the webinar has ended.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                Seat limit
              </CardTitle>
              <CardDescription>
                {seatsLeft === null
                  ? 'Unlimited seats. Set a number to start a waitlist once it fills.'
                  : seatsLeft > 0
                    ? `${seatsLeft} of ${webinar.capacity} seat${webinar.capacity === 1 ? '' : 's'} left.`
                    : `Full — new sign-ups join the waitlist${waitlistedCount > 0 ? ` (${waitlistedCount} waiting)` : ''}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  defaultValue={webinar.capacity ?? ''}
                  disabled={saving === 'capacity'}
                  aria-label="Seat limit"
                  onBlur={(e) => {
                    const raw = e.target.value.trim()
                    const next = raw === '' ? null : Number(raw)
                    if (next !== null && (!Number.isFinite(next) || next < 1)) {
                      e.target.value = String(webinar.capacity ?? '')
                      return
                    }
                    if (next === webinar.capacity) return
                    void patch({ capacity: next }, 'capacity')
                  }}
                  className="w-32"
                />
                {saving === 'capacity' && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Only approved registrants take a seat. When one frees up, the
                longest-waiting person is let in automatically
                {webinar.require_approval ? ' — back into your approval queue' : ''}.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-500" />
                Registration questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CustomQuestionsEditor
                value={questionsDraft}
                onChange={setQuestionsDraft}
                disabled={saving === 'custom_questions'}
              />
              {questionsDirty && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={saving === 'custom_questions'}
                    onClick={() =>
                      patch({ custom_questions: parseQuestions(questionsDraft) }, 'custom_questions')
                    }
                  >
                    {saving === 'custom_questions' ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    ) : (
                      'Save questions'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving === 'custom_questions'}
                    onClick={() => setQuestionsDraft(savedQuestions)}
                  >
                    Discard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    Registrations
                  </CardTitle>
                  <CardDescription>
                    {registrations.length}{' '}
                    {registrations.length === 1 ? 'person' : 'people'}{' '}
                    pre-registered
                    {pendingCount > 0 && (
                      <span className="font-medium text-amber-700">
                        {' '}· {pendingCount} awaiting you
                      </span>
                    )}
                    {waitlistedCount > 0 && (
                      <span className="text-slate-500">
                        {' '}· {waitlistedCount} waitlisted
                      </span>
                    )}
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={reloadRegistrations}
                  disabled={refreshingRegs}
                  title="Refresh"
                  className="mt-0.5 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', refreshingRegs && 'animate-spin')}
                  />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No one has registered yet. Share the registration link
                  above.
                </p>
              ) : (
                <>
                  <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {registrations.map((r) => {
                      const ans = r.custom_answers ?? {}
                      const answered = savedQuestions.filter((q) => (ans[q.id] ?? '').trim())
                      return (
                        <li key={r.id} className="flex flex-col py-2">
                          <span className="font-medium text-slate-900">
                            {r.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {r.email}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            {formatWithZone(
                              new Date(r.registered_at),
                              localTimezone(),
                            )}
                            {r.confirmation_sent_at && (
                              <span
                                className="inline-flex items-center gap-1 text-emerald-600"
                                title={`Confirmation emailed ${new Date(r.confirmation_sent_at).toLocaleString()}`}
                              >
                                <Mail className="h-3 w-3" />
                                emailed
                              </span>
                            )}
                            {(r.reminder_24h_sent_at || r.reminder_1h_sent_at) && (
                              <span
                                className="inline-flex items-center gap-1 text-emerald-600"
                                title={[
                                  r.reminder_24h_sent_at &&
                                    `Day-before reminder ${new Date(r.reminder_24h_sent_at).toLocaleString()}`,
                                  r.reminder_1h_sent_at &&
                                    `Hour-before reminder ${new Date(r.reminder_1h_sent_at).toLocaleString()}`,
                                ]
                                  .filter(Boolean)
                                  .join('\n')}
                              >
                                <BellRing className="h-3 w-3" />
                                reminded
                              </span>
                            )}
                          </span>
                          {r.status !== 'approved' && (
                            <span
                              className={cn(
                                'mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                r.status === 'pending' && 'bg-amber-50 text-amber-800',
                                r.status === 'waitlisted' && 'bg-slate-100 text-slate-700',
                                r.status === 'declined' && 'bg-red-50 text-red-700',
                              )}
                            >
                              {r.status === 'pending'
                                ? 'Awaiting your approval'
                                : r.status === 'waitlisted'
                                  ? 'Waitlisted'
                                  : 'Declined'}
                            </span>
                          )}
                          {webinar.require_approval && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {r.status !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={statusSaving === r.id}
                                  onClick={() => void changeStatus(r, 'approved')}
                                >
                                  {statusSaving === r.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Approve
                                </Button>
                              )}
                              {r.status !== 'waitlisted' && r.status !== 'declined' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-slate-500"
                                  disabled={statusSaving === r.id}
                                  onClick={() => void changeStatus(r, 'waitlisted')}
                                >
                                  Waitlist
                                </Button>
                              )}
                              {r.status !== 'declined' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-red-600"
                                  disabled={statusSaving === r.id}
                                  onClick={() => void changeStatus(r, 'declined')}
                                >
                                  <X className="h-3 w-3" />
                                  Decline
                                </Button>
                              )}
                            </div>
                          )}
                          {answered.length > 0 && (
                            <dl className="mt-1.5 space-y-1 border-l-2 border-slate-100 pl-2">
                              {answered.map((q) => (
                                <div key={q.id}>
                                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                    {q.label}
                                  </dt>
                                  <dd className="whitespace-pre-wrap text-xs text-slate-600">
                                    {ans[q.id]}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={exportRegistrationsCsv}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'group flex w-full items-start justify-between gap-3 rounded-lg p-2.5 text-left transition',
        disabled ? 'opacity-60' : 'hover:bg-slate-50',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-slate-500">{icon}</span>
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      <span
        className={cn(
          'mt-0.5 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-slate-300',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
