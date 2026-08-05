import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ImagePlus,
  Loader2,
  X,
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
  useUniversal,
  useSubscription,
  useUser,
  useCurrentUserIdentity,
} from '@unisim/sdk'
import { cn } from '@/lib/utils'
import { createWebinar, deleteWebinar } from '@/lib/db'
import { rememberManageToken, uploadLogo, sendHostOtp, verifyHostOtp } from '@/lib/host'
import { getErrorMessage } from '@/lib/errors'
import { slugifyTitle } from '@/lib/slug'
import CustomQuestionsEditor from '@/components/CustomQuestionsEditor'
import { type CustomQuestion, parseQuestions } from '@/lib/customQuestions'

// Turn the backend RPC's coded errors into host-friendly copy. Tokens are
// per-app now (one free Webinar token per org, migration 0045) — token_in_use
// only ever names this app's own live webinar, never another app.
function friendlyTokenError(msg: string): string {
  if (msg.includes('token_in_use:')) {
    const what = msg.split('token_in_use:')[1]?.trim() || 'a live webinar'
    return `Your free Webinar token is in use (${what}). Add a token to host another webinar.`
  }
  if (msg.includes('no_credits')) {
    return "You've used your free Webinar token. Add a token to host another webinar."
  }
  return msg
}

export function HostNewForm() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement | null>(null)

  // Universal ID session (separate from the webinar's email-OTP host flow).
  // Hosting now requires a (free) Universal ID account — that's where the one
  // complimentary webinar token lives. A signed-in free-tier account spends its
  // token to host (non-refundable, since live hosting costs us money).
  const { supabase: suiteClient } = useUniversal()
  const { user: suiteUser, loading: suiteLoading } = useUser()
  const identity = useCurrentUserIdentity()
  const { subscription } = useSubscription()
  const freeTier = !!suiteUser && subscription?.tier === 'free'
  const tokenCount = subscription?.credits ?? 0
  const needsAccount = !suiteLoading && !suiteUser
  // Signed in with a Universal ID → we already hold their (verified) email and
  // name, so we don't ask for them again. A signed-in ID always has a confirmed
  // email (the OTP/verification step is what mints the account), so there's no
  // "signed in but unverified" state to pre-fill an editable field for.
  const signedInEmail = identity.email ?? suiteUser?.email ?? ''
  const signedInName = identity.displayName ?? ''

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [hostName, setHostName] = useState('')
  const [hostEmail, setHostEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [showGuestCount, setShowGuestCount] = useState(true)
  const [allowSpeakRequests, setAllowSpeakRequests] = useState(false)
  const [sendConfirmation, setSendConfirmation] = useState(true)
  const [sendReminders, setSendReminders] = useState(true)
  const [capacity, setCapacity] = useState('')
  const [sendFollowup, setSendFollowup] = useState(true)
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [optionalOpen, setOptionalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // When not signed in, clicking Go live sends a verification code (which creates
  // the account); the host types it here, then the webinar is created.
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  // "Go live" now, or "Schedule webinar" when a future date/time is set.
  const isScheduled = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now()
  const goLabel = isScheduled ? 'Schedule webinar' : 'Go live'

  function pickLogo(file: File | null) {
    if (!file) {
      setLogoFile(null)
      setLogoPreview(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Logo must be an image (PNG, JPG, SVG).')
      return
    }
    if (file.size > 1024 * 1024) {
      setError('Logo must be under 1 MB.')
      return
    }
    setError(null)
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Create the webinar, spend the free token where applicable, and jump in.
  // Runs directly when already signed in, or right after OTP verification (below)
  // creates the account and signs the host in.
  const createAndGo = useCallback(async () => {
    setError(null)
    setSubmitting(true)
    try {
      let logoUrl: string | null = null
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile)
      }
      // When signed in the "About you" fields are hidden, so take the host's
      // details straight from their Universal ID rather than the empty inputs.
      const effHostName = needsAccount ? hostName : signedInName
      const effHostEmail = needsAccount ? hostEmail : signedInEmail
      const slug = slugifyTitle(title)
      const created = await createWebinar({
        slug,
        title: title.trim(),
        description: description.trim(),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        show_guest_count: showGuestCount,
        allow_speak_requests: allowSpeakRequests,
        send_confirmation: sendConfirmation,
        send_reminders: sendReminders,
        capacity: capacity.trim() === '' ? null : Number(capacity),
        send_followup: sendFollowup,
        host_name: effHostName.trim() || null,
        host_email: effHostEmail.trim().toLowerCase() || null,
        company_name: companyName.trim() || null,
        logo_url: logoUrl,
        custom_questions: parseQuestions(customQuestions),
      })

      // Free-tier Universal ID host: spend the one free token (non-refundable).
      // On token failure, roll the just-created webinar back so we never leave a
      // webinar the host can't actually run. Token errors block; anything else
      // (e.g. no org, or a brand-new account whose subscription hasn't loaded) is
      // non-fatal — the webinar stands, no token taken.
      if (freeTier) {
        const { error: tokErr } = await suiteClient.rpc('acquire_token_hold', {
          p_app: 'webinar',
          p_resource_id: created.slug,
          p_label: `Webinar: ${title.trim() || created.slug}`,
          p_refundable: false,
        })
        if (tokErr && (tokErr.message.includes('token_in_use:') || tokErr.message.includes('no_credits'))) {
          const removed = await deleteWebinar(created.id)
          if (removed === 0) {
            // Deliberately not thrown: the host needs to see the token error,
            // not a rollback error. But a rollback that removed nothing has
            // left an unrunnable webinar behind, and that must not be silent.
            console.warn(
              `Rollback did not remove webinar "${created.slug}" — it was created but no token was taken.`,
            )
          }
          setError(friendlyTokenError(tokErr.message))
          return
        }
      }

      rememberManageToken(created.slug, created.manage_token)
      navigate(`/host/w/${created.slug}?token=${created.manage_token}`, {
        replace: true,
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }, [logoFile, title, description, scheduledAt, showGuestCount, allowSpeakRequests, sendConfirmation, sendReminders, capacity, sendFollowup, customQuestions, needsAccount, hostName, hostEmail, signedInName, signedInEmail, companyName, freeTier, suiteClient, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Already signed in with a Universal ID → straight to creating the webinar.
    if (!needsAccount) {
      await createAndGo()
      return
    }
    // Otherwise, sign them up on the spot: send a verification code to their email
    // (creating their Universal ID account), which they enter below.
    if (!hostEmail.trim()) {
      setError('Enter your email so we can send your verification code.')
      return
    }
    setSubmitting(true)
    try {
      await sendHostOtp(hostEmail.trim().toLowerCase())
      setOtpStep(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify() {
    if (!otpCode.trim()) return
    setError(null)
    setVerifying(true)
    try {
      await verifyHostOtp(hostEmail.trim().toLowerCase(), otpCode.trim())
      // Signed in now (the account was created) — go create the webinar.
      setOtpStep(false)
      setOtpCode('')
      await createAndGo()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>About the session</CardTitle>
        <CardDescription>
          What's it called and when does it run?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Product walkthrough — Q4"
              required
            />
          </div>

          {needsAccount ? (
            // Not signed in → collect an email so we can send a verification
            // code (which creates their Universal ID) when they go live.
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                About you
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hostName">Your name</Label>
                  <Input
                    id="hostName"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Jane Cooper"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hostEmail">Your email</Label>
                  <Input
                    id="hostEmail"
                    type="email"
                    value={hostEmail}
                    onChange={(e) => setHostEmail(e.target.value)}
                    placeholder="jane@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                We'll send a 6-digit code here when you click <strong>Go
                live</strong>.
              </p>
            </div>
          ) : (
            // Signed in → we already have their verified details; don't ask again.
            !suiteLoading && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Hosting as{' '}
                  <strong className="text-slate-700">
                    {signedInName || signedInEmail}
                  </strong>
                  {signedInName && signedInEmail && (
                    <span className="text-slate-400"> · {signedInEmail}</span>
                  )}
                  .
                </p>
              </div>
            )
          )}

          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setOptionalOpen((v) => !v)}
              aria-expanded={optionalOpen ? 'true' : 'false'}
              aria-controls="optional-details"
              className="flex w-full items-center justify-between rounded-md py-1 text-left transition-colors hover:text-slate-900"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Optional details
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  optionalOpen && 'rotate-180',
                )}
              />
            </button>
            {optionalOpen && (
              <div id="optional-details" className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A short blurb shown on the join page."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledAt">Scheduled for</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="capacity">Seat limit</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-slate-500">
                    Leave blank for unlimited. Once it's full, new sign-ups join
                    a waitlist and are let in automatically if someone drops out.
                  </p>
                </div>

                <div className="pt-2">
                  <CustomQuestionsEditor
                    value={customQuestions}
                    onChange={setCustomQuestions}
                    disabled={submitting}
                  />
                </div>

                <div className="pt-2">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Branding
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="companyName"
                        className="flex items-center gap-1.5"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        Company name
                      </Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="UNI SIM"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Logo</Label>
                      {logoPreview ? (
                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                          <img
                            src={logoPreview}
                            alt="logo preview"
                            className="h-10 w-10 rounded object-contain"
                          />
                          <span className="flex-1 truncate text-xs text-slate-500">
                            {logoFile?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => pickLogo(null)}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Remove logo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => fileInput.current?.click()}
                        >
                          <ImagePlus className="h-4 w-4" />
                          Upload logo
                        </Button>
                      )}
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          pickLogo(e.target.files?.[0] ?? null)
                        }
                      />
                      <p className="text-xs text-slate-500">
                        PNG / JPG / SVG, under 1 MB.
                      </p>
                    </div>
                  </div>
                </div>

                <fieldset className="rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-xs font-medium text-slate-500">
                    Default settings (you can change later)
                  </legend>
                  <label className="flex items-start gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={showGuestCount}
                      onChange={(e) => setShowGuestCount(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        Show attendee count to guests
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={allowSpeakRequests}
                      onChange={(e) =>
                        setAllowSpeakRequests(e.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        Allow guests to request to speak
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={sendConfirmation}
                      onChange={(e) => setSendConfirmation(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        Email registrants a confirmation
                      </span>
                      <span className="block text-xs text-slate-500">
                        Their own join link, plus a calendar invite when the
                        session has a date.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={sendReminders}
                      onChange={(e) => setSendReminders(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        Remind registrants before it starts
                      </span>
                      <span className="block text-xs text-slate-500">
                        A nudge the day before and again an hour ahead. Needs a
                        scheduled date.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={sendFollowup}
                      onChange={(e) => setSendFollowup(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        Email a follow-up afterwards
                      </span>
                      <span className="block text-xs text-slate-500">
                        Thanks to those who came, a catch-up link to those who
                        missed it.
                      </span>
                    </span>
                  </label>
                </fieldset>
              </div>
            )}
          </div>

          {freeTier && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <p className="font-medium">Hosting uses your free Webinar token.</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Every Universal app comes with one free token; conducting a webinar spends this app&apos;s,
                and it <strong>won't be returned</strong> — live hosting costs us money to run.
                You have {tokenCount} purchased token{tokenCount === 1 ? '' : 's'}.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {otpStep ? (
            <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Check your email</p>
              <p className="text-xs text-slate-600">
                We sent a 6-digit code to <strong>{hostEmail.trim().toLowerCase()}</strong>. Enter it to create your
                account and {isScheduled ? 'schedule' : 'start'} your webinar.
              </p>
              <div className="flex gap-2 pt-1">
                <Input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  aria-label="6-digit verification code"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleVerify() } }}
                />
                <Button type="button" onClick={() => void handleVerify()} disabled={verifying || otpCode.trim().length < 6}>
                  {verifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify &amp; {isScheduled ? 'schedule' : 'go live'}</>}
                </Button>
              </div>
              <button type="button" onClick={() => { setOtpStep(false); setError(null) }} className="text-xs text-slate-500 underline-offset-2 hover:underline">
                Use a different email
              </button>
            </div>
          ) : (
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {needsAccount ? 'Sending code…' : 'Creating…'}
                </>
              ) : (
                <>
                  {goLabel}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
