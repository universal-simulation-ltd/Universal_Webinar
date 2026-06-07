import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react'
import {
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  Hand,
  Loader2,
  Lock,
  MessageSquare,
  MicOff,
  MonitorUp,
  Power,
  Settings2,
  Users,
  VolumeX,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChatPanel } from '@/components/ChatPanel'
import { cn } from '@/lib/utils'
import {
  countRegistrations,
  getWebinarBySlug,
  kickAttendee,
  listAttendees,
  listMessages,
  listReactionsForWebinar,
  listRegistrations,
  listSpeakRequests,
  muteAttendee,
  resolveSpeakRequest,
  setAttendeeRole,
  softDeleteMessage,
  updateWebinar,
} from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { getLiveKitToken, isLiveKitConfigured } from '@/lib/livekit'
import {
  joinWebinarChannel,
  leaveChannel,
} from '@/lib/realtime'
import type {
  AttendeeRow,
  MessageRow,
  ReactionRow,
  RegistrationRow,
  SpeakRequestRow,
  WebinarRow,
} from '@/lib/database.types'

export function AdminControl() {
  const { slug = '' } = useParams()
  const [webinar, setWebinar] = useState<WebinarRow | null>(null)
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [registrationCount, setRegistrationCount] = useState(0)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [speakRequests, setSpeakRequests] = useState<SpeakRequestRow[]>([])
  const [viewerCount, setViewerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // LiveKit host
  const [lkToken, setLkToken] = useState<string | null>(null)
  const [lkUrl, setLkUrl] = useState<string>('')
  const [lkFetching, setLkFetching] = useState(false)

  const knownMessageIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const w = await getWebinarBySlug(slug)
        if (!active) return
        if (!w) {
          setError(`No webinar found for slug "${slug}".`)
          return
        }
        setWebinar(w)
        const [count, regs, msgs, rxns, atts, reqs] = await Promise.all([
          countRegistrations(w.id),
          listRegistrations(w.id),
          listMessages(w.id),
          listReactionsForWebinar(w.id),
          listAttendees(w.id),
          listSpeakRequests(w.id),
        ])
        if (!active) return
        setRegistrationCount(count)
        setRegistrations(regs)
        setMessages(msgs)
        setReactions(rxns)
        setAttendees(atts)
        setSpeakRequests(reqs)
        knownMessageIds.current = new Set(msgs.map((m) => m.id))
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

  // Realtime
  useEffect(() => {
    if (!webinar) return
    const channel = joinWebinarChannel(webinar.id, null, {
      onMessageInsert: (row) => {
        if (knownMessageIds.current.has(row.id)) return
        knownMessageIds.current.add(row.id)
        setMessages((prev) => [...prev, row])
      },
      onMessageUpdate: (row) => {
        setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)))
      },
      onReactionInsert: (row) =>
        setReactions((prev) =>
          prev.some((r) => r.id === row.id) ? prev : [...prev, row],
        ),
      onReactionDelete: (id) =>
        setReactions((prev) => prev.filter((r) => r.id !== id)),
      onPresence: setViewerCount,
      onAttendeeUpdate: (row) => {
        setAttendees((prev) => {
          const exists = prev.some((a) => a.id === row.id)
          if (row.left_at) return prev.filter((a) => a.id !== row.id)
          return exists
            ? prev.map((a) => (a.id === row.id ? row : a))
            : [...prev, row]
        })
      },
      onSpeakRequestInsert: (row) => {
        setSpeakRequests((prev) =>
          prev.some((r) => r.id === row.id) ? prev : [...prev, row],
        )
      },
      onSpeakRequestUpdate: (row) => {
        setSpeakRequests((prev) =>
          row.status === 'pending'
            ? prev.map((r) => (r.id === row.id ? row : r))
            : prev.filter((r) => r.id !== row.id),
        )
      },
    })
    return () => {
      void leaveChannel(channel)
    }
  }, [webinar])

  // LiveKit host token (when going live)
  useEffect(() => {
    if (!webinar || webinar.status !== 'live' || lkToken) return
    if (!isLiveKitConfigured()) return
    setLkFetching(true)
    getLiveKitToken(webinar.id, null, 'host')
      .then(({ token, url }) => {
        setLkToken(token)
        setLkUrl(url)
      })
      .catch(() => {})
      .finally(() => setLkFetching(false))
  }, [webinar, lkToken])

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await softDeleteMessage(messageId)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not delete message.'))
    }
  }, [])

  const handleMute = useCallback(
    async (attendeeId: string, muted: boolean) => {
      try {
        await muteAttendee(attendeeId, muted)
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === attendeeId ? { ...a, muted_by_admin: muted } : a,
          ),
        )
      } catch (err) {
        setError(getErrorMessage(err, 'Could not update attendee.'))
      }
    },
    [],
  )

  const handleKick = useCallback(async (attendeeId: string) => {
    try {
      await kickAttendee(attendeeId)
      setAttendees((prev) => prev.filter((a) => a.id !== attendeeId))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not kick attendee.'))
    }
  }, [])

  const handleBan = useCallback(async (attendeeId: string) => {
    try {
      await setAttendeeRole(attendeeId, 'banned')
      setAttendees((prev) => prev.filter((a) => a.id !== attendeeId))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not ban attendee.'))
    }
  }, [])

  const handleApproveSpeaker = useCallback(
    async (requestId: string) => {
      try {
        await resolveSpeakRequest(requestId, 'approved')
        setSpeakRequests((prev) => prev.filter((r) => r.id !== requestId))
      } catch (err) {
        setError(getErrorMessage(err, 'Could not approve request.'))
      }
    },
    [],
  )

  const handleDenySpeaker = useCallback(
    async (requestId: string) => {
      try {
        await resolveSpeakRequest(requestId, 'denied')
        setSpeakRequests((prev) => prev.filter((r) => r.id !== requestId))
      } catch (err) {
        setError(getErrorMessage(err, 'Could not deny request.'))
      }
    },
    [],
  )

  async function patchWebinar(patch: Partial<WebinarRow>, label: string) {
    if (!webinar) return
    setSaving(label)
    try {
      const next = await updateWebinar(webinar.id, patch)
      setWebinar(next)
    } catch (err) {
      setError(getErrorMessage(err, 'Update failed.'))
    } finally {
      setSaving(null)
    }
  }

  async function toggleLive() {
    if (!webinar) return
    const goingLive = webinar.status !== 'live'
    await patchWebinar(
      {
        status: goingLive ? 'live' : 'ended',
        started_at:
          goingLive && !webinar.started_at
            ? new Date().toISOString()
            : webinar.started_at,
        ended_at: goingLive ? null : new Date().toISOString(),
      },
      'status',
    )
    // Clear LK token so it's re-fetched with the new status.
    if (!goingLive) setLkToken(null)
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

  if (error || !webinar) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-700">{error}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/admin">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const lkReady = lkToken && lkUrl && isLiveKitConfigured()

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Control room
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {webinar.title}{' '}
            <span className="text-slate-400">·</span>{' '}
            <span className="text-slate-500 text-base font-mono">
              /{webinar.slug}
            </span>
          </h1>
          {webinar.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {webinar.description}
            </p>
          )}
        </div>
        <Button
          size="lg"
          variant={webinar.status === 'live' ? 'destructive' : 'default'}
          onClick={toggleLive}
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={copyShareLink}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy registration link'}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/w/${webinar.slug}/register`} target="_blank">
            Open registration page ↗
          </Link>
        </Button>
        {viewerCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-soft">
            <Users className="h-3.5 w-3.5" />
            {viewerCount} watching now
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Host stage */}
          <Card>
            <CardHeader>
              <CardTitle>Your stage</CardTitle>
              <CardDescription>
                {isLiveKitConfigured()
                  ? webinar.status === 'live'
                    ? 'You are live — guests can see and hear you.'
                    : 'Click "Go live" to start broadcasting.'
                  : 'LiveKit is not configured — add VITE_LIVEKIT_URL to enable video.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
                {lkReady ? (
                  <LiveKitRoom
                    serverUrl={lkUrl}
                    token={lkToken!}
                    connect
                    audio
                    video
                    style={{ height: '100%', width: '100%' }}
                  >
                    <VideoConference />
                  </LiveKitRoom>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <div className="text-center">
                      {lkFetching ? (
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
                      ) : (
                        <>
                          <Camera className="mx-auto h-10 w-10 text-slate-500" />
                          <p className="mt-2 text-sm">
                            {isLiveKitConfigured()
                              ? 'Camera preview starts when you go live.'
                              : 'Configure VITE_LIVEKIT_URL to enable video.'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {!lkReady && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" disabled={!lkReady}>
                    <Camera className="h-4 w-4" />
                    Test camera
                  </Button>
                  <Button variant="outline" disabled={!lkReady}>
                    <MonitorUp className="h-4 w-4" />
                    Share screen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Speaker queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hand className="h-4 w-4 text-slate-500" />
                Speaker queue
                {speakRequests.length > 0 && (
                  <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {speakRequests.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Approve guests to share their camera and mic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {speakRequests.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No pending requests. Raise-hand requests appear here in
                  realtime.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {speakRequests.map((req) => {
                    const att = attendees.find((a) => a.id === req.attendee_id)
                    return (
                      <li
                        key={req.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-slate-900">
                          {att?.name ?? 'Guest'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveSpeaker(req.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDenySpeaker(req.id)}
                          >
                            Deny
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Live chat */}
          <Card className="flex h-[480px] flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                Live chat
              </CardTitle>
              <CardDescription>
                Hover any message to delete it.
              </CardDescription>
            </CardHeader>
            <div className="flex-1 min-h-0 border-t border-slate-100">
              <ChatPanel
                messages={messages}
                reactions={reactions}
                currentAttendeeId={null}
                isAdmin
                readOnly
                onDeleteMessage={handleDeleteMessage}
              />
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          {/* Room settings */}
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
                  patchWebinar({ show_guest_count: next }, 'show_guest_count')
                }
              />
              <ToggleRow
                icon={<Hand className="h-4 w-4" />}
                label="Allow speaker requests"
                hint="Guests can request to join the conversation."
                checked={webinar.allow_speak_requests}
                disabled={saving === 'allow_speak_requests'}
                onChange={(next) =>
                  patchWebinar(
                    { allow_speak_requests: next },
                    'allow_speak_requests',
                  )
                }
              />
              <ToggleRow
                icon={<Lock className="h-4 w-4" />}
                label="PIN-lock the webinar"
                hint="Coming soon."
                checked={false}
                disabled
                onChange={() => {}}
              />
            </CardContent>
          </Card>

          {/* Live attendees */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                In the room
              </CardTitle>
              <CardDescription>
                {attendees.length} live
                {attendees.length !== viewerCount
                  ? ` · ${viewerCount} presence`
                  : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendees.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nobody's joined yet. Share the registration link.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {attendees.map((att) => (
                    <AttendeeRow
                      key={att.id}
                      attendee={att}
                      onMute={handleMute}
                      onKick={handleKick}
                      onBan={handleBan}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                Registrations
              </CardTitle>
              <CardDescription>
                {registrationCount} pre-registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No one has registered yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {registrations.slice(0, 10).map((r) => (
                    <li key={r.id} className="flex flex-col py-2">
                      <span className="font-medium text-slate-900">
                        {r.name}
                      </span>
                      <span className="text-xs text-slate-500">{r.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ── Attendee row with moderation controls ─────────────────────────────────────
function AttendeeRow({
  attendee,
  onMute,
  onKick,
  onBan,
}: {
  attendee: AttendeeRow
  onMute: (id: string, muted: boolean) => void
  onKick: (id: string) => void
  onBan: (id: string) => void
}) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {attendee.name}
          {attendee.role === 'speaker' && (
            <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
              speaker
            </span>
          )}
        </p>
        {attendee.muted_by_admin && (
          <p className="text-[11px] text-amber-600">muted</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          title={attendee.muted_by_admin ? 'Unmute' : 'Mute'}
          onClick={() => onMute(attendee.id, !attendee.muted_by_admin)}
          className={cn(
            'rounded p-1 transition hover:bg-slate-100',
            attendee.muted_by_admin
              ? 'text-amber-600'
              : 'text-slate-400 hover:text-slate-700',
          )}
        >
          {attendee.muted_by_admin ? (
            <MicOff className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          title="Kick (remove for this session)"
          onClick={() => onKick(attendee.id)}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Ban permanently"
          onClick={() => onBan(attendee.id)}
          className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
        >
          <Lock className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}

// ── Toggle row helper ─────────────────────────────────────────────────────────
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
