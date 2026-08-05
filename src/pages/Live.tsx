import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  LiveKitRoom,
  VideoConference,
  useConnectionState,
  useTracks,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react'
import { ConnectionState, Track } from 'livekit-client'
import { AlertCircle, FileText, Hand, Heart, Loader2, Mic, MicOff, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CameraBubble } from '@/components/CameraBubble'
import { ChatPanel } from '@/components/ChatPanel'
import { SharedDocViewer } from '@/components/SharedDocViewer'
import {
  FloatingReactions,
  type FloatingReactionsHandle,
} from '@/components/FloatingReactions'
import {
  addReaction,
  getMyAttendee,
  getWebinarBySlug,
  listMessages,
  listReactionsForWebinar,
  listSpeakRequests,
  raiseSpeakRequest,
  removeReaction,
  sendMessage,
  webinarRowFromRealtime,
} from '@/lib/db'
import { getErrorMessage } from '@/lib/errors'
import { getLiveKitToken, isLiveKitConfigured } from '@/lib/livekit'
import {
  broadcastFloatingReaction,
  joinWebinarChannel,
  leaveChannel,
} from '@/lib/realtime'
import type {
  AttendeeRow,
  MessageRow,
  ReactionRow,
  SpeakRequestRow,
  WebinarRow,
} from '@/lib/database.types'

const FLOATING_EMOJIS = ['❤️', '👏', '🎉', '🔥'] as const

// ── Video stage ────────────────────────────────────────────────────────────────
// Renders the host's published tracks (video + audio) from a LiveKit room.
// Falls back to a placeholder when the host hasn't published yet.
function HostStage({ serverUrl, token }: { serverUrl: string; token: string }) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={false}
      video={false}
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      <HostStageInner />
    </LiveKitRoom>
  )
}

function HostStageInner() {
  const connectionState = useConnectionState()
  const videoTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  })
  const audioTracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true,
  })

  // Pick the screen share deliberately rather than taking videoTracks[0] and
  // hoping: with both published the array order is not guaranteed, so a guest
  // could have been shown the host's face while a slide deck went unseen.
  const screenTrack = videoTracks.find((t) => t.source === Track.Source.ScreenShare)
  const cameraTrack = videoTracks.find((t) => t.source === Track.Source.Camera)
  const hostVideoTrack = screenTrack ?? cameraTrack
  // Only a bubble when there is something behind it to sit on top of.
  const hostBubbleTrack = screenTrack ? cameraTrack : undefined
  const hostAudioTrack = audioTracks[0]

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="absolute inset-0 grid place-items-center text-slate-300">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
          <p className="mt-2 text-sm">Connecting to live video…</p>
        </div>
      </div>
    )
  }

  if (!hostVideoTrack) {
    return (
      <div className="absolute inset-0 grid place-items-center text-slate-300">
        <p className="text-sm">Host hasn't started the camera yet.</p>
      </div>
    )
  }

  return (
    <>
      {hostAudioTrack && <AudioTrack trackRef={hostAudioTrack} />}
      <VideoTrack
        trackRef={hostVideoTrack}
        style={{
          width: '100%',
          height: '100%',
          // A shared screen is cropped by `cover` — losing the edges of a slide
          // or the taskbar you were pointing at. Contain it; a camera feed
          // still fills the frame.
          objectFit: screenTrack ? 'contain' : 'cover',
        }}
      />
      {hostBubbleTrack && (
        <CameraBubble
          trackRef={hostBubbleTrack}
          storageKey="unisim-webinar-camera-bubble-guest"
          label="Presenter camera"
        />
      )}
    </>
  )
}

// ── Speaker stage (for an approved speaker) ────────────────────────────────────
function SpeakerConferenceStage({
  serverUrl,
  token,
}: {
  serverUrl: string
  token: string
}) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      <VideoConference />
    </LiveKitRoom>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function Live() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()

  const [webinar, setWebinar] = useState<WebinarRow | null>(null)
  const [attendee, setAttendee] = useState<AttendeeRow | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [viewerCount, setViewerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Speak request state
  const [speakRequest, setSpeakRequest] = useState<SpeakRequestRow | null>(null)
  const [raisingHand, setRaisingHand] = useState(false)
  // Shown for a few seconds after the host takes someone off air. Being on air
  // is self-evident (your own camera appears); being taken off it is not —
  // without this the stage just quietly changes back and you are left
  // wondering whether you were cut off or something broke.
  const [offAirNotice, setOffAirNotice] = useState(false)

  // LiveKit
  const [lkToken, setLkToken] = useState<string | null>(null)
  const [lkUrl, setLkUrl] = useState<string>('')
  const [lkFetching, setLkFetching] = useState(false)

  const floatingHandleRef = useRef<FloatingReactionsHandle | null>(null)
  const channelRef = useRef<ReturnType<typeof joinWebinarChannel> | null>(null)
  const knownMessageIds = useRef<Set<string>>(new Set())

  // ── Load webinar + attendee ──────────────────────────────────────────────
  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const w = await getWebinarBySlug(slug)
        if (!active) return
        if (!w) {
          setError(`No webinar found for "${slug}".`)
          return
        }
        setWebinar(w)

        const me = await getMyAttendee(w.id)
        if (!active) return
        if (!me) {
          navigate(`/w/${w.slug}`, { replace: true })
          return
        }
        if (me.role === 'banned') {
          navigate(`/w/${w.slug}?banned=1`, { replace: true })
          return
        }
        setAttendee(me)

        const [initialMessages, initialReactions, pendingRequests] =
          await Promise.all([
            listMessages(w.id),
            listReactionsForWebinar(w.id),
            listSpeakRequests(w.id),
          ])
        if (!active) return
        setMessages(initialMessages)
        setReactions(initialReactions)
        const myRequest = pendingRequests.find((r) => r.attendee_id === me.id)
        if (myRequest) setSpeakRequest(myRequest)
        knownMessageIds.current = new Set(initialMessages.map((m) => m.id))
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Could not load the room.'))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slug, navigate])

  // ── Pick up what the host changes mid-session ────────────────────────────
  // Chiefly the shared document appearing, changing or being taken down, and
  // the room going live or ending.
  //
  // This used to be a 15-second poll, written that way because nobody had
  // established that a CDC payload for a `webinars` UPDATE couldn't carry
  // `manage_token`. It can't: Realtime filters columns by the subscriber's
  // grants, verified against prod on 2026-08-05 (SUPABASE.md). So the row now
  // arrives on the channel this page already holds — see the onWebinarUpdate
  // handler below — and this is only the fallback path for when it doesn't.
  //
  // ⚠️ A realtime payload is NOT filtered by WEBINAR_COLUMNS, so it is narrowed
  // by `webinarRowFromRealtime` rather than trusted to match. A full refetch
  // through `getWebinarBySlug` is by definition the right shape.
  const refreshWebinar = useCallback(async () => {
    try {
      const next = await getWebinarBySlug(slug)
      if (next) setWebinar(next)
    } catch {
      // Best-effort. The subscription is the primary path; a failed catch-up
      // read shouldn't put an error on a room that is otherwise working.
    }
  }, [slug])

  // Fallback 2 of 2 (the other is the refetch on every (re)SUBSCRIBED). A tab
  // that has been in the background — a phone with the screen off, most often —
  // can have had its socket killed by the OS without the client noticing yet,
  // so anything the host changed while it was away would never arrive. Reading
  // once on the way back costs a single request at the moment somebody is
  // actually looking, which is cheaper than any poll and covers the one case a
  // reconnect can't.
  const roomLoaded = webinar !== null
  useEffect(() => {
    if (!roomLoaded) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshWebinar()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [roomLoaded, refreshWebinar])

  // ── Fetch LiveKit token when webinar goes live ───────────────────────────
  useEffect(() => {
    if (!webinar || !attendee || webinar.status !== 'live' || lkToken) return
    if (!isLiveKitConfigured()) return

    setLkFetching(true)
    const role = attendee.role === 'speaker' ? 'speaker' : 'viewer'
    getLiveKitToken(webinar.id, attendee.id, role)
      .then(({ token, url }) => {
        setLkToken(token)
        setLkUrl(url)
      })
      .catch(() => {
        // Non-fatal; fall back to placeholder.
      })
      .finally(() => setLkFetching(false))
  }, [webinar, attendee, lkToken])

  // ── Realtime subscription ────────────────────────────────────────────────
  // Identity of the room and of this guest, pulled out as primitives so the
  // effect below does not depend on the `webinar` / `attendee` objects.
  //
  // ⚠️ Load-bearing now that host edits arrive on this channel. Depending on
  // the webinar object meant every change to the row tore the channel down and
  // rebuilt it — merely wasteful when the row only changed on a 15s poll (which
  // dropped and re-tracked presence every 15 seconds), but with the webinars
  // subscription in the same channel it is a loop: update → new object →
  // rebuild → SUBSCRIBED → refetch → new object → rebuild.
  const webinarId = webinar?.id ?? null
  const webinarSlug = webinar?.slug ?? null
  const attendeeId = attendee?.id ?? null
  const attendeeName = attendee?.name ?? null
  const attendeeRole = attendee?.role ?? null

  useEffect(() => {
    if (!webinarId || !webinarSlug || !attendeeId || !attendeeName) return
    const channel = joinWebinarChannel(
      webinarId,
      { attendeeId, name: attendeeName },
      {
        onMessageInsert: (row) => {
          if (knownMessageIds.current.has(row.id)) return
          knownMessageIds.current.add(row.id)
          setMessages((prev) => [...prev, row])
        },
        onMessageUpdate: (row) => {
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)))
        },
        onReactionInsert: (row) => {
          setReactions((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, row],
          )
        },
        onReactionDelete: (id) => {
          setReactions((prev) => prev.filter((r) => r.id !== id))
        },
        onFloatingReaction: ({ emoji }) => {
          floatingHandleRef.current?.spawn(emoji)
        },
        onPresence: setViewerCount,
        // The host changed the room under us. The payload is narrowed to the
        // columns a `select` would have returned and MERGED over what we hold,
        // so a column the database hasn't granted us leaves its last known
        // value alone rather than blanking it — a replace would silently turn
        // an unlisted column into `undefined` mid-session.
        onWebinarUpdate: (row) => {
          const patch = webinarRowFromRealtime(row)
          setWebinar((prev) => (prev ? { ...prev, ...patch } : prev))
        },
        // Fallback 1 of 2. Runs on the first subscribe (harmless — the row was
        // just loaded) and, crucially, again after every reconnect, so a
        // dropped socket costs one stale window instead of the rest of the
        // session. Without it, replacing the poll would have traded "15 seconds
        // behind" for "never updates again".
        onSubscribed: () => {
          void refreshWebinar()
        },
        onAttendeeUpdate: (row) => {
          if (row.id !== attendeeId) return
          if (row.role === 'banned') {
            navigate(`/w/${webinarSlug}?banned=1`, { replace: true })
            return
          }
          if (row.left_at) {
            navigate(`/w/${webinarSlug}?kicked=1`, { replace: true })
            return
          }
          const promoted = attendeeRole !== 'speaker' && row.role === 'speaker'
          const demoted = attendeeRole === 'speaker' && row.role !== 'speaker'
          setAttendee(row)
          // A LiveKit token has `canPublish` baked in at mint time, so a role
          // change invalidates whichever one this browser is holding. Dropping
          // it makes the fetch effect above mint a fresh one for the new role.
          //
          // ⚠️ This must NOT be conditional on there being no token yet, which
          // is what it used to say. A guest in a live room ALWAYS already holds
          // a viewer token — precisely the case where a promotion has to
          // replace it — so being put on air swapped them onto the speaker
          // stage still carrying `canPublish: false`, and their camera and mic
          // buttons then failed for no visible reason.
          if (promoted || demoted) setLkToken(null)
          if (demoted) {
            // Their request is spent. Clearing it is what puts the "Request to
            // speak" button back, rather than leaving them on an 'approved'
            // request that renders nothing at all.
            setSpeakRequest(null)
            setOffAirNotice(true)
          }
          if (promoted) setOffAirNotice(false)
        },
        onSpeakRequestUpdate: (row) => {
          if (row.attendee_id === attendeeId) {
            setSpeakRequest(row)
          }
        },
      },
    )
    channelRef.current = channel
    return () => {
      channelRef.current = null
      void leaveChannel(channel)
    }
    // `lkToken` is deliberately NOT a dependency: the handlers no longer read
    // it, and leaving it in tore the whole channel down and rebuilt it every
    // time a token arrived.
  }, [
    webinarId,
    webinarSlug,
    attendeeId,
    attendeeName,
    attendeeRole,
    navigate,
    refreshWebinar,
  ])

  // Clear the off-air line on its own rather than leaving it up for the rest of
  // the session — by then it is telling someone something they worked out
  // several minutes ago.
  useEffect(() => {
    if (!offAirNotice) return
    const id = setTimeout(() => setOffAirNotice(false), 10_000)
    return () => clearTimeout(id)
  }, [offAirNotice])

  const handleSend = useCallback(
    async (content: string) => {
      if (!webinar || !attendee) return
      await sendMessage(webinar.id, attendee.id, content)
    },
    [webinar, attendee],
  )

  const handleAddReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!attendee) return
      await addReaction(messageId, attendee.id, emoji)
    },
    [attendee],
  )

  const handleRemoveReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!attendee) return
      await removeReaction(messageId, attendee.id, emoji)
    },
    [attendee],
  )

  const handleFloating = useCallback(
    async (emoji: string) => {
      if (!attendee || !channelRef.current) return
      floatingHandleRef.current?.spawn(emoji)
      await broadcastFloatingReaction(channelRef.current, {
        emoji,
        fromName: attendee.name,
      })
    },
    [attendee],
  )

  const handleRaiseHand = useCallback(async () => {
    if (!webinar || !attendee || speakRequest?.status === 'pending') return
    setRaisingHand(true)
    try {
      const req = await raiseSpeakRequest({
        webinar_id: webinar.id,
        attendee_id: attendee.id,
      })
      setSpeakRequest(req)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send request.'))
    } finally {
      setRaisingHand(false)
    }
  }, [webinar, attendee, speakRequest])

  // ── Render ───────────────────────────────────────────────────────────────
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
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-xl font-semibold">{error ?? 'Room unavailable'}</h1>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isSpeaker = attendee?.role === 'speaker'
  const lkReady = lkToken && lkUrl && isLiveKitConfigured()

  return (
    <div className="container py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {webinar.logo_url && (
            <img
              src={webinar.logo_url}
              alt={webinar.company_name ?? ''}
              className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-1"
            />
          )}
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {webinar.title}
            </h1>
            <p className="text-sm text-slate-500">
              {webinar.company_name ? `${webinar.company_name} · ` : ''}
              Welcome{attendee ? `, ${attendee.name.split(' ')[0]}` : ''} —
              enjoy the show.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {webinar.show_guest_count && viewerCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-soft">
              <Users className="h-3.5 w-3.5" />
              {viewerCount} watching
            </span>
          )}
          {webinar.status === 'live' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Waiting to start
            </span>
          )}
        </div>
      </div>

      {attendee?.muted_by_admin && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <MicOff className="h-4 w-4 shrink-0" />
          The host has muted you. You can still read the chat.
        </div>
      )}

      {/* Being put on air changes the video panel from something you watch into
          something you are in, which is a big enough surprise to say out loud —
          and the camera and mic are NOT switched on for them, so somebody has
          to mention where the buttons are. */}
      {isSpeaker && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-900">
          <Mic className="h-4 w-4 shrink-0" />
          The host has put you on air. Use the camera and microphone buttons
          under the video to join in — everyone in the room can see and hear
          you.
        </div>
      )}

      {offAirNotice && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
          <MicOff className="h-4 w-4 shrink-0" />
          You're off air now — your camera and microphone are off. You can carry
          on watching and chatting, and raise your hand again any time.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-soft">
            {isSpeaker && lkReady ? (
              <SpeakerConferenceStage serverUrl={lkUrl} token={lkToken!} />
            ) : lkReady ? (
              <HostStage serverUrl={lkUrl} token={lkToken!} />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-center text-slate-300">
                <div>
                  {lkFetching ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
                  ) : webinar.status === 'live' ? (
                    <>
                      <AlertCircle className="mx-auto h-8 w-8 text-slate-500" />
                      <p className="mt-2 text-sm">
                        {isLiveKitConfigured()
                          ? 'Could not connect to video stream.'
                          : 'Live video coming soon.'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">
                      Video will appear when the host goes live.
                    </p>
                  )}
                </div>
              </div>
            )}
            <FloatingReactions
              registerHandle={(h) => (floatingHandleRef.current = h)}
            />
          </div>

          {/* Shown BELOW the video rather than replacing it: the host may be
              talking over the document, and a guest who loses the speaker to
              see a slide has lost the webinar. Scrolling, zooming and paging
              are the browser's own — nothing here follows the host's page. */}
          {webinar.shared_doc_url && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">
                    {webinar.shared_doc_name ?? 'Shared document'}
                  </span>
                </span>
                <a
                  href={webinar.shared_doc_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-brand-700 underline underline-offset-2"
                >
                  Open ↗
                </a>
              </div>
              <SharedDocViewer
                url={webinar.shared_doc_url}
                name={webinar.shared_doc_name ?? 'Shared document'}
                className="h-[480px]"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {/* A host who has stopped this person asking doesn't get told
                again — the button simply goes. The insert trigger from 0097
                is the actual enforcement; hiding it is just manners. */}
            {webinar.allow_speak_requests &&
              !isSpeaker &&
              !attendee?.speak_blocked && (
                <SpeakRequestButton
                  speakRequest={speakRequest}
                  loading={raisingHand}
                  onRaise={handleRaiseHand}
                />
              )}
            {isSpeaker && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                You're on air
              </span>
            )}
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-soft">
              <Heart className="h-3.5 w-3.5 text-brand-500" />
              {FLOATING_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleFloating(emoji)}
                  className="text-base leading-none p-1 hover:scale-125 transition-transform"
                  aria-label={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex h-[600px] flex-col rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Chat</h2>
            {attendee?.muted_by_admin && (
              <span className="text-[11px] font-medium text-amber-700">
                muted by host
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel
              messages={messages}
              reactions={reactions}
              currentAttendeeId={attendee?.id ?? null}
              isAdmin={false}
              readOnly={attendee?.muted_by_admin}
              onSend={handleSend}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function SpeakRequestButton({
  speakRequest,
  loading,
  onRaise,
}: {
  speakRequest: SpeakRequestRow | null
  loading: boolean
  onRaise: () => void
}) {
  if (speakRequest?.status === 'pending') {
    return (
      <Button variant="secondary" disabled>
        <Hand className="h-4 w-4" />
        Request sent — waiting…
      </Button>
    )
  }
  if (speakRequest?.status === 'approved') {
    // They're on air (or a beat away from it — the two realtime events can
    // arrive either way round); the "You're on air" badge is what shows. Being
    // taken back off air clears the request, so this can't strand anyone
    // buttonless afterwards.
    return null
  }
  if (speakRequest?.status === 'denied') {
    return (
      <Button variant="outline" disabled>
        <Hand className="h-4 w-4" />
        Request denied by host
      </Button>
    )
  }
  return (
    <Button onClick={onRaise} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Hand className="h-4 w-4" />
      )}
      Request to speak
    </Button>
  )
}
