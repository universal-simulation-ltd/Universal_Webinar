import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Radio,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type CustomAnswers,
  parseQuestions,
  validateAnswers,
  cleanAnswers,
} from '@/lib/customQuestions'
import { AddToCalendarButton } from '@/components/AddToCalendarButton'
import { HostedBy } from '@/components/HostedBy'
import { useAuth } from '@/lib/auth'
import {
  getMyAttendee,
  getRegistrationByJoinToken,
  getWebinarBySlug,
  getWebinarFreeSeats,
  joinAsAttendee,
  registerForWebinar,
  sendRegistrationConfirmation,
} from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { RegistrationStatus, WebinarRow } from '@/lib/database.types'

const NAME_KEY = 'uw:lastName'
const EMAIL_KEY = 'uw:lastEmail'

export function Register() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, loading: authLoading, configured, signInAnonymously } = useAuth()

  // `?t=` is the per-registrant join token from a confirmation email — holding
  // it proves you're the person who registered, on whatever device you open the
  // email with.
  const joinToken = params.get('t')

  const [webinar, setWebinar] = useState<WebinarRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? '')
  const [answers, setAnswers] = useState<CustomAnswers>({})
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Whether the backend actually accepted this registration's confirmation
  // email, so the success card can say so honestly rather than promising a
  // message that may never arrive.
  const [confirmationSent, setConfirmationSent] = useState(false)
  // Phase 6. On a gated webinar a registrant is held at 'pending' until the
  // host acts, so "registered" and "allowed in" are no longer the same thing.
  const [regStatus, setRegStatus] = useState<RegistrationStatus>('approved')
  // Whether the room is out of seats. Anon can't count registrations, so this
  // comes from the webinar_free_seats() RPC rather than a client-side tally.
  const [roomFull, setRoomFull] = useState(false)

  // The host's custom registration questions (cleaned of anything malformed).
  const questions = useMemo(() => parseQuestions(webinar?.custom_questions), [webinar])

  // "Gated" = the server will decide this registrant's status rather than
  // auto-approving them: either the host vets sign-ups, or seats are capped.
  const gated = !!webinar && (webinar.require_approval || webinar.capacity != null)

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const w = await getWebinarBySlug(slug)
        if (!active) return
        setWebinar(w)
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Load failed.'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slug])

  useEffect(() => {
    if (!webinar || webinar.capacity == null) return
    let active = true
    ;(async () => {
      try {
        const free = await getWebinarFreeSeats(webinar.id)
        if (active) setRoomFull(free !== null && free <= 0)
      } catch {
        // Non-fatal — worst case we don't warn, and the trigger waitlists them.
      }
    })()
    return () => {
      active = false
    }
  }, [webinar])

  // Arrived from a confirmation email. Exchange the token for this registrant's
  // own details and show them the "you're in" state straight away — they've
  // already registered, so never ask them to fill the form again (and never make
  // them find the device they registered on).
  useEffect(() => {
    if (!webinar || !joinToken) return
    let active = true
    ;(async () => {
      try {
        const found = await getRegistrationByJoinToken(joinToken)
        if (!active || !found || found.webinar_id !== webinar.id) return
        setName(found.name)
        setEmail(found.email)
        setRegStatus(found.status)
        if (found.status !== 'approved') {
          setRegistered(true)
          return
        }
        if (webinar.status === 'live') {
          navigate(`/w/${webinar.slug}/live`, { replace: true })
        } else {
          setRegistered(true)
        }
      } catch {
        // A bad or stale token just falls through to the normal form.
      }
    })()
    return () => {
      active = false
    }
  }, [webinar, joinToken, navigate])

  // If the user already has an attendee row in this webinar (returning visit),
  // treat the page as the success-state view rather than asking for details
  // again. Live webinars send them straight to the room.
  useEffect(() => {
    if (!webinar || authLoading || !user) return
    let active = true
    ;(async () => {
      try {
        const existing = await getMyAttendee(webinar.id)
        if (!active || !existing) return
        if (webinar.status === 'live') {
          navigate(`/w/${webinar.slug}/live`, { replace: true })
        } else {
          setRegistered(true)
        }
      } catch {
        // Non-fatal.
      }
    })()
    return () => {
      active = false
    }
  }, [webinar, authLoading, user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!webinar) return
    setError(null)
    // Validate the host's required custom questions before doing anything else.
    const aErrors = validateAnswers(questions, answers)
    setAnswerErrors(aErrors)
    if (Object.keys(aErrors).length > 0) {
      setError('Please answer the required questions.')
      return
    }
    setSubmitting(true)
    try {
      // 1. Make sure we have a Supabase session (anonymous is fine).
      if (!user) {
        const result = await signInAnonymously()
        if (result.error) {
          setError(result.error)
          return
        }
      }
      const { data: userResult } = await supabase.auth.getUser()
      const userId = userResult.user?.id
      if (!userId) {
        setError('Could not start a session. Try again.')
        return
      }
      const trimmedName = name.trim()
      const trimmedEmail = email.trim().toLowerCase()

      // 2. Capture in registrations (idempotent on email), with any answers.
      await registerForWebinar(webinar.id, trimmedName, trimmedEmail, cleanAnswers(questions, answers))

      // 3. Create the attendee row tied to this anon user (idempotent).
      //    Skipped when the room is gated in ANY way — by approval or by a seat
      //    limit. The database trigger rejects it regardless, and a guest who
      //    is pending or waitlisted has no seat yet.
      if (!gated) {
        const existing = await getMyAttendee(webinar.id)
        if (!existing) {
          await joinAsAttendee({
            webinar_id: webinar.id,
            name: trimmedName,
            email: trimmedEmail,
            auth_user_id: userId,
          })
        }
      }

      localStorage.setItem(NAME_KEY, trimmedName)
      localStorage.setItem(EMAIL_KEY, trimmedEmail)

      // 4. Email them their confirmation + personal join link. Fired without
      // awaiting so a slow provider never holds up the "you're in" state — the
      // seat is already saved, and the call can't throw.
      void sendRegistrationConfirmation(webinar.id, trimmedEmail).then(
        setConfirmationSent,
      )

      // 5. Send live attendees straight into the room — no second prompt.
      //    A gated registrant stays here instead; they aren't in yet.
      if (gated) {
        // The insert can't tell us its own status back (anon has no SELECT on
        // registrations), so mirror the server's rule: approval first, then the
        // seat limit. Re-read the seat count rather than trusting the value
        // fetched on page load — someone else may have taken the last seat
        // while this form was open.
        let full = roomFull
        if (!webinar.require_approval && webinar.capacity != null) {
          try {
            const free = await getWebinarFreeSeats(webinar.id)
            full = free !== null && free <= 0
          } catch {
            // Keep the on-load value.
          }
        }
        setRegStatus(
          webinar.require_approval ? 'pending' : full ? 'waitlisted' : 'approved',
        )
        setRegistered(true)
        return
      }
      if (webinar.status === 'live') {
        navigate(`/w/${webinar.slug}/live`, { replace: true })
        return
      }
      setRegistered(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not register.'))
    } finally {
      setSubmitting(false)
    }
  }

  const joinUrl = useMemo(() => {
    if (!webinar) return ''
    return `${window.location.origin}/w/${webinar.slug}/live`
  }, [webinar])

  const scheduleInfo = useMemo(() => {
    if (!webinar?.scheduled_at) return null
    const date = new Date(webinar.scheduled_at)
    return {
      date,
      isFuture: date.getTime() > Date.now(),
      label: date.toLocaleString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }
  }, [webinar])

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!webinar) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-semibold">We couldn't find that webinar.</h1>
          <p className="mt-2 text-slate-500">
            The link might be wrong or the room may have been removed.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <HostedBy webinar={webinar} />
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {!registered
              ? 'Save your seat'
              : regStatus === 'approved'
                ? "You're in"
                : regStatus === 'declined'
                  ? 'Not approved'
                  : regStatus === 'waitlisted'
                    ? 'On the waitlist'
                    : 'Awaiting approval'}
          </span>
        </div>

        {registered && regStatus !== 'approved' ? (
          // Phase 6 — registered, but the host gates this room. Deliberately no
          // "Enter the room" button and no calendar invite: nothing is confirmed
          // until they're approved, and offering either would imply a seat they
          // don't have.
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
                {regStatus === 'declined'
                  ? 'Not approved this time'
                  : regStatus === 'waitlisted'
                    ? "You're on the waitlist"
                    : 'Waiting for the host'}
              </CardTitle>
              <CardDescription className="space-y-1.5">
                {regStatus === 'declined' ? (
                  <p>
                    The host isn't able to give you a place at{' '}
                    <strong>{webinar.title}</strong>. If you think that's a
                    mistake, get in touch with them directly.
                  </p>
                ) : regStatus === 'waitlisted' ? (
                  <p>
                    <strong>{webinar.title}</strong> is full, so you're on the
                    waitlist. We'll email <strong>{email}</strong> if a place
                    opens up.
                  </p>
                ) : (
                  <p>
                    Your request to join <strong>{webinar.title}</strong> has
                    gone to the host. We'll email <strong>{email}</strong> with
                    your join link as soon as they approve it.
                  </p>
                )}
                {scheduleInfo?.isFuture && regStatus !== 'declined' && (
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {scheduleInfo.label}
                  </p>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : registered ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                You're in.
              </CardTitle>
              <CardDescription className="space-y-1.5">
                <p>
                  We saved your spot for <strong>{webinar.title}</strong>.
                </p>
                {scheduleInfo?.isFuture && (
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {scheduleInfo.label}
                  </p>
                )}
                {webinar.status === 'live' && (
                  <p className="flex items-center gap-1.5 font-medium text-red-700">
                    <Radio className="h-3.5 w-3.5" />
                    Happening right now.
                  </p>
                )}
                {confirmationSent && (
                  <p className="flex items-start gap-1.5 text-slate-500">
                    <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      We've emailed <strong>{email}</strong> your join link
                      {scheduleInfo?.isFuture ? ' and a calendar invite' : ''} —
                      keep it and use it to join from any device.
                    </span>
                  </p>
                )}
                {webinar.send_reminders && scheduleInfo?.isFuture && (
                  <p className="flex items-start gap-1.5 text-slate-500">
                    <BellRing className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      We'll nudge you the day before and again an hour before it
                      starts.
                    </span>
                  </p>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduleInfo?.isFuture && (
                <AddToCalendarButton
                  webinar={webinar}
                  joinUrl={joinUrl}
                />
              )}
              <Button asChild className="w-full" size="lg">
                <Link to={`/w/${webinar.slug}/live`}>
                  {webinar.status === 'live'
                    ? 'Enter the room'
                    : scheduleInfo?.isFuture
                      ? 'Open the waiting room'
                      : 'Enter the room'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-500"
                onClick={async () => {
                  await supabase.auth.signOut()
                  setRegistered(false)
                  setConfirmationSent(false)
                  setRegStatus('approved')
                  setName('')
                  setEmail('')
                  localStorage.removeItem(NAME_KEY)
                  localStorage.removeItem(EMAIL_KEY)
                }}
              >
                Register someone else
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{webinar.title}</CardTitle>
              <CardDescription className="space-y-1.5">
                {webinar.description && <p>{webinar.description}</p>}
                {scheduleInfo && (
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {scheduleInfo.label}
                  </p>
                )}
                {webinar.status === 'live' && (
                  <p className="flex items-center gap-1.5 font-medium text-red-700">
                    <Radio className="h-3.5 w-3.5" />
                    Happening right now — register to join in.
                  </p>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roomFull && (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <strong>This session is full.</strong> You can still sign up —
                  you'll join the waitlist, and we'll email you if a place opens
                  up.
                </div>
              )}
              {!configured && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Supabase isn't connected yet. The host needs to finish setup.
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Cooper"
                    autoComplete="name"
                    required
                    maxLength={80}
                    disabled={submitting || !configured}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    autoComplete="email"
                    required
                    maxLength={200}
                    disabled={submitting || !configured}
                  />
                  <p className="text-xs text-slate-500">
                    {webinar.send_confirmation
                      ? 'We email your join link here, and share it only with the host.'
                      : 'We share this only with the host.'}
                  </p>
                </div>

                {questions.map((q) => {
                  const val = answers[q.id] ?? ''
                  const setVal = (v: string) => {
                    setAnswers((prev) => ({ ...prev, [q.id]: v }))
                    if (answerErrors[q.id]) setAnswerErrors((prev) => ({ ...prev, [q.id]: '' }))
                  }
                  const qErr = answerErrors[q.id]
                  return (
                    <div key={q.id} className="space-y-1.5">
                      <Label htmlFor={`q-${q.id}`}>
                        {q.label}
                        {q.required && <span className="ml-0.5 text-red-500">*</span>}
                      </Label>
                      {q.type === 'textarea' ? (
                        <textarea
                          id={`q-${q.id}`}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          rows={3}
                          maxLength={500}
                          disabled={submitting || !configured}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                        />
                      ) : q.type === 'select' ? (
                        <select
                          id={`q-${q.id}`}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          disabled={submitting || !configured}
                          className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                        >
                          <option value="">Choose…</option>
                          {(q.options ?? []).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={`q-${q.id}`}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          maxLength={500}
                          disabled={submitting || !configured}
                        />
                      )}
                      {qErr && <p className="text-xs text-red-600">{qErr}</p>}
                    </div>
                  )
                })}

                {error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting || !configured}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : webinar.status === 'live' ? (
                    'Join now'
                  ) : (
                    'Save my seat'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">
          {!registered
            ? 'By joining, you agree to be visible to the host.'
            : regStatus === 'approved'
              ? 'See you soon.'
              : regStatus === 'declined'
                ? ''
                : "You don't need to do anything else — we'll be in touch."}
        </p>
      </div>
    </div>
  )
}
