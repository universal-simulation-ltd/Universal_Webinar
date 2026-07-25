import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
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
import { HostedBy } from '@/components/HostedBy'
import { useAuth } from '@/lib/auth'
import {
  getMyAttendee,
  getWebinarBySlug,
  joinAsAttendee,
  registerForWebinar,
} from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import type { WebinarRow } from '@/lib/database.types'

const NAME_KEY = 'uw:lastName'
const EMAIL_KEY = 'uw:lastEmail'

export function Join() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, signInAnonymously, configured } = useAuth()

  const [webinar, setWebinar] = useState<WebinarRow | null>(null)
  const [webinarLoading, setWebinarLoading] = useState(true)
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? '')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Phase 1 stub flag — gates the PIN input. Phase 6 wires real PIN checking.
  const requiresPin = false

  useEffect(() => {
    let active = true
    setWebinarLoading(true)
    ;(async () => {
      try {
        const w = await getWebinarBySlug(slug)
        if (!active) return
        setWebinar(w)
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Load failed.'))
      } finally {
        if (active) setWebinarLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slug])

  // If we already have an attendee in this webinar (from an earlier visit),
  // skip the form and go straight to the live room.
  useEffect(() => {
    if (!webinar || !user || authLoading) return
    let active = true
    ;(async () => {
      try {
        const existing = await getMyAttendee(webinar.id)
        if (active && existing) {
          navigate(`/w/${webinar.slug}/live`, { replace: true })
        }
      } catch {
        // Non-fatal; user can still join via the form.
      }
    })()
    return () => {
      active = false
    }
  }, [webinar, user, authLoading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!webinar) return
    setError(null)
    setSubmitting(true)
    try {
      // Make sure we have a Supabase user (anonymous is fine).
      if (!user) {
        const result = await signInAnonymously()
        if (result.error) {
          setError(result.error)
          return
        }
      }
      // Re-read user to get the fresh id post-signin.
      const { data: userResult } = await import('@/lib/supabase').then((m) =>
        m.supabase.auth.getUser(),
      )
      const userId = userResult.user?.id
      if (!userId) {
        setError('Could not start a session. Try again.')
        return
      }
      // Register the walk-up as well as admitting them. Without this they'd be
      // invisible in the host's registrations list and would miss the
      // post-session follow-up — and registering first is also what lets the
      // server decide their status (approved / waitlisted / pending), which the
      // attendee trigger then enforces. Idempotent on email.
      await registerForWebinar(webinar.id, name.trim(), email.trim().toLowerCase())

      // Avoid double-insert if attendee already exists.
      const existing = await getMyAttendee(webinar.id)
      if (!existing) {
        await joinAsAttendee({
          webinar_id: webinar.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          auth_user_id: userId,
        })
      }
      localStorage.setItem(NAME_KEY, name.trim())
      localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase())
      navigate(`/w/${webinar.slug}/live`, { replace: true })
    } catch (err) {
      // Phase 6: the attendee trigger rejects anyone the host hasn't approved.
      // Translate its coded message into something a guest can act on rather
      // than surfacing a raw Postgres error.
      const raw = getErrorMessage(err, 'Could not join.')
      if (raw.includes('open_join_disabled')) {
        setError(
          "The host has closed walk-up joining for this session. If you registered earlier, use the join link in your confirmation email.",
        )
      } else if (raw.includes('webinar_full')) {
        setError(
          "This session is full. Register on the sign-up page to join the waitlist — we'll email you if a place opens up.",
        )
      } else if (raw.includes('registration is waitlisted')) {
        setError(
          "You're on the waitlist for this session. We'll email you if a place opens up.",
        )
      } else if (raw.includes('approval_required')) {
        setError(
          raw.includes('no registration found')
            ? "This webinar is invite-only — you'll need to register first, and the host approves each request."
            : "You've registered, but the host hasn't approved your place yet. We'll email you when they do.",
        )
      } else {
        setError(raw)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (webinarLoading) {
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
            The link might be wrong or the room may have ended.
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
            Hosted on Universal Webinar
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{webinar.title}</CardTitle>
            <CardDescription>
              {webinar.require_approval
                ? 'This room is approved by the host. Register first and they’ll let you in.'
                : !webinar.open_join
                  ? 'Walk-up joining is closed for this session. Registered guests can still join with the link from their confirmation email.'
                  : 'Tell us who you are so the host can welcome you in.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  We share this only with the host.
                </p>
              </div>

              {requiresPin && (
                <div className="space-y-1.5">
                  <Label htmlFor="pin" className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Webinar PIN
                  </Label>
                  <Input
                    id="pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
              )}

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting || !configured || !webinar.open_join}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining…
                  </>
                ) : !webinar.open_join ? (
                  'Walk-up joining is closed'
                ) : (
                  'Join now'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          By joining, you agree to be visible to the host and may be invited to
          speak.
        </p>
      </div>
    </div>
  )
}
