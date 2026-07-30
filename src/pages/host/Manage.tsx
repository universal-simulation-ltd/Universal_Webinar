import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Archive,
  Ban,
  BellRing,
  Camera,
  Check,
  Copy,
  DoorClosed,
  DoorOpen,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  Hand,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  MonitorUp,
  Power,
  RefreshCw,
  Settings2,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
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
import { PanelCard } from '@/components/PanelCard'
import { SharedDocViewer } from '@/components/SharedDocViewer'
import { cn } from '@/lib/utils'
import {
  removeSharedDoc,
  SHARED_DOC_TYPES,
  uploadSharedDoc,
} from '@/lib/sharedDoc'
import { usePanelLayout } from '@/lib/usePanelLayout'
import {
  archiveWebinarByToken,
  denySpeakRequestByToken,
  getWebinarAttendanceByToken,
  getWebinarBySlug,
  getWebinarStatsByToken,
  listRegistrationsByToken,
  listSpeakQueueByToken,
  sendRegistrationConfirmation,
  setRegistrationStatusByToken,
  setSpeakBlockByToken,
  type WebinarStats,
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
  AttendanceRow,
  RegistrationRow,
  RegistrationStatus,
  SpeakQueueRow,
  WebinarRow,
  WebinarUpdate,
} from '@/lib/database.types'

// ──────────────────────────────────────────────────────────────────────────────
// Right-column layout
//
// The host column had grown long, and which cards matter depends entirely on
// where the webinar is in its life — questions and seats before, the speaker
// queue during, stats and the export after. Rather than guess an order for
// everyone, each card collapses and the column can be dragged into whatever
// order this host works in, remembered per browser.
//
// ⚠️ Adding, removing or renaming an id here invalidates every stored layout
// (usePanelLayout only honours a saved order holding exactly this set), so
// existing hosts silently revert to this default. That is the intended trade:
// far better than a stale layout hiding a new card.
// ──────────────────────────────────────────────────────────────────────────────
type PanelId =
  | 'room'
  | 'communication'
  | 'openJoin'
  | 'recording'
  | 'questions'
  | 'stats'
  | 'registrations'
  | 'close'

const PANEL_DEFAULTS: PanelId[] = [
  'room',
  'communication',
  'openJoin',
  'recording',
  'questions',
  'stats',
  'registrations',
  'close',
]

const PANEL_STORAGE_KEY = 'unisim-webinar-host-panels'

/** How often the speaker queue re-reads itself while a session is live. */
const SPEAK_QUEUE_POLL_MS = 10_000

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

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
  const [stats, setStats] = useState<WebinarStats | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [speakQueue, setSpeakQueue] = useState<SpeakQueueRow[]>([])
  const [speakBusy, setSpeakBusy] = useState<string | null>(null)
  const [docBusy, setDocBusy] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  // "Shrunk from 8.2 MB to 640 KB" — worth saying, since the host picked a file
  // that would otherwise have been refused.
  const [docNote, setDocNote] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  // Closing destroys data on the free tier, so the host has to have taken their
  // export first. Tracked rather than merely suggested — see the close card.
  const [exported, setExported] = useState(false)

  const {
    order: panelOrder,
    isCollapsed,
    toggleCollapsed,
    reorder: reorderPanels,
    resetLayout,
  } = usePanelLayout<PanelId>(PANEL_STORAGE_KEY, PANEL_DEFAULTS)
  const [dragging, setDragging] = useState<PanelId | null>(null)
  const [dropTarget, setDropTarget] = useState<PanelId | null>(null)
  // Only a press on the grip arms a drag. Without this every card is draggable
  // from anywhere, and dragging a slider or a text field becomes a card move.
  const armedGrip = useRef<PanelId | null>(null)

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

  // Attendance is keyed by lowercased email — the same definition migration
  // 0096, the stats RPC and the follow-up emailer all use, so the badge, the
  // count and who got a "we missed you" can't tell three different stories.
  const attendedByEmail = useMemo(
    () => new Map(attendance.map((a) => [a.email.toLowerCase(), a])),
    [attendance],
  )
  // Anyone in the room who matches no registration walked up — a newsletter
  // link or a forwarded join URL rather than the registration form.
  const walkUps = useMemo(() => {
    const registered = new Set(registrations.map((r) => r.email.toLowerCase()))
    return attendance.filter((a) => !registered.has(a.email.toLowerCase()))
  }, [attendance, registrations])
  // "Didn't turn up" is only meaningful once there was something to turn up to,
  // and only for people who were actually let in — someone still pending or
  // declined never had the chance. Before the session it would just be a wall
  // of red on a healthy registrations list.
  const showNoShows = webinar?.status === 'ended'

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
        try {
          const s = await getWebinarStatsByToken(w.slug, token)
          if (active) setStats(s)
        } catch {
          // Non-fatal — the panel still works without the summary.
        }
        try {
          const a = await getWebinarAttendanceByToken(w.slug, token)
          if (active) setAttendance(a)
        } catch {
          // Also non-fatal: the attendance RPC is newer than some deployed
          // databases, and a host who can't see who turned up should still get
          // their registrations list rather than an error page.
        }
        try {
          const q = await listSpeakQueueByToken(w.slug, token)
          if (active) setSpeakQueue(q)
        } catch {
          // Same again — the queue card simply doesn't appear.
        }
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

  // Hands go up mid-session, and this page can't use realtime for them: the
  // `speak_requests` policies are `to authenticated`, and a manage-token host
  // is anon. So poll — but only while the room is actually live, since that is
  // the only window in which the queue can change.
  useEffect(() => {
    if (!webinar || !token || webinar.status !== 'live') return
    const slugNow = webinar.slug
    let active = true
    const id = setInterval(() => {
      void listSpeakQueueByToken(slugNow, token)
        .then((q) => {
          if (active) setSpeakQueue(q)
        })
        .catch(() => {
          // A dropped poll is nothing to report — the next one covers it.
        })
    }, SPEAK_QUEUE_POLL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [webinar, token])

  async function refreshSpeakQueue() {
    if (!webinar || !token) return
    try {
      setSpeakQueue(await listSpeakQueueByToken(webinar.slug, token))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not refresh the speaker queue.'))
    }
  }

  /** Turn this one request down. They can raise their hand again. */
  async function cancelSpeakRequest(row: SpeakQueueRow) {
    if (!webinar || !token) return
    setSpeakBusy(row.request_id)
    try {
      await denySpeakRequestByToken(webinar.slug, token, row.request_id)
      setSpeakQueue((prev) => prev.filter((r) => r.request_id !== row.request_id))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not cancel that request.'))
    } finally {
      setSpeakBusy(null)
    }
  }

  /** Stop them asking again for the rest of the session. Not a ban — they stay
   *  in the room, keep watching and keep chatting. */
  async function blockSpeaker(row: SpeakQueueRow) {
    if (!webinar || !token) return
    setSpeakBusy(row.request_id)
    try {
      await setSpeakBlockByToken(webinar.slug, token, row.attendee_id, true)
      // The RPC denies their pending request too, so drop every row for that
      // person rather than just this one.
      setSpeakQueue((prev) => prev.filter((r) => r.attendee_id !== row.attendee_id))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not stop that person asking.'))
    } finally {
      setSpeakBusy(null)
    }
  }

  // ── Shared document ────────────────────────────────────────────────────────
  // Two steps that must not half-happen: put the bytes in storage, then point
  // the webinar at them. If the second fails the object is deleted again,
  // otherwise every abandoned upload would sit in the bucket forever with
  // nothing referencing it.
  async function shareDocument(file: File) {
    if (!webinar || !token) return
    setDocError(null)
    setDocNote(null)
    setDocBusy(true)
    const previous = webinar.shared_doc_url
    try {
      const uploaded = await uploadSharedDoc(webinar.id, file)
      try {
        await patchStrict(
          { shared_doc_url: uploaded.url, shared_doc_name: uploaded.name },
          'shared_doc',
        )
      } catch (err) {
        await removeSharedDoc(uploaded.url)
        throw err
      }
      // Replacing? The old one is now unreferenced.
      if (previous) await removeSharedDoc(previous)
      if (uploaded.size < uploaded.originalSize) {
        setDocNote(
          `Shrunk from ${formatBytes(uploaded.originalSize)} to ${formatBytes(uploaded.size)} before uploading.`,
        )
      }
    } catch (err) {
      setDocError(
        getErrorMessage(err, "That didn't upload. Try again, or use a smaller file."),
      )
    } finally {
      setDocBusy(false)
    }
  }

  async function stopSharingDocument() {
    if (!webinar || !token) return
    const url = webinar.shared_doc_url
    setDocError(null)
    setDocNote(null)
    setDocBusy(true)
    try {
      // Clear the reference first. If the delete then fails the host still has
      // an empty stage, which is what they asked for — the orphan goes with the
      // webinar at purge time.
      await patchStrict({ shared_doc_url: null, shared_doc_name: null }, 'shared_doc')
      if (url) await removeSharedDoc(url)
    } catch (err) {
      setDocError(getErrorMessage(err, 'Could not take that down.'))
    } finally {
      setDocBusy(false)
    }
  }

  /** Like `patch`, but lets the failure through so a caller can undo its own
   *  half-finished work (the shared-document upload is the reason this exists). */
  async function patchStrict(update: WebinarUpdate, label: string) {
    if (!webinar || !token) throw new Error('Not signed in to this webinar.')
    setSaving(label)
    try {
      setWebinar(await updateWebinarByToken(webinar.slug, token, update))
    } finally {
      setSaving(null)
    }
  }

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
      // Attendance moves faster than registrations during a live session, so
      // the refresh has to pick it up too — otherwise walk-ups only appear on
      // a full page reload. Failing here shouldn't lose the registrations we
      // just fetched, hence the inner catch.
      try {
        setAttendance(await getWebinarAttendanceByToken(webinar.slug, token))
      } catch {
        // Non-fatal, same reasoning as the initial load.
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not refresh registrations.'))
    } finally {
      setRefreshingRegs(false)
    }
  }

  function exportRegistrationsCsv() {
    // Walk-ups are worth exporting even if nobody pre-registered, so the guard
    // is "is there anyone at all", not "are there registrations".
    if (!webinar || (registrations.length === 0 && attendance.length === 0)) return
    setExported(true)
    downloadCsv(
      buildRegistrationsCsv(registrations, savedQuestions, attendance),
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

  async function closeWebinar() {
    if (!webinar || !token) return
    setClosing(true)
    try {
      const next = await archiveWebinarByToken(webinar.slug, token)
      setWebinar(next)
      setConfirmClose(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not close the webinar.'))
    } finally {
      setClosing(false)
    }
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

  // ── Right-column drag + collapse plumbing ──────────────────────────────────
  // HTML5 drag and drop, matching Ergo Assess's panel reordering. Note it is
  // pointer-only: touch devices don't fire these events, and there is no
  // keyboard equivalent. Acceptable here because order is a preference, not
  // functionality — every card stays reachable in any order, the column
  // collapses to one stack on narrow screens anyway, and collapsing itself
  // (the part that changes what you can see) is a plain button.
  const panelDragProps = (id: PanelId) => ({
    draggable: true as const,
    onDragStart: (e: React.DragEvent) => {
      if (armedGrip.current !== id) {
        e.preventDefault()
        return
      }
      e.dataTransfer.effectAllowed = 'move'
      setDragging(id)
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      setDropTarget(id)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      if (dragging && dragging !== id) reorderPanels(dragging, id)
      setDragging(null)
      setDropTarget(null)
    },
    onDragEnd: () => {
      armedGrip.current = null
      setDragging(null)
      setDropTarget(null)
    },
    className: cn(
      'transition-opacity',
      dragging === id && 'opacity-30',
      dropTarget === id && dragging !== id && 'outline outline-2 outline-brand-500',
    ),
  })

  const panelProps = (id: PanelId) => ({
    collapsed: isCollapsed(id),
    onToggle: () => toggleCollapsed(id),
    dragProps: panelDragProps(id),
    onGripDown: () => {
      armedGrip.current = id
    },
    onGripUp: () => {
      armedGrip.current = null
    },
  })

  // Each card is declared in reading order below but rendered by the map at the
  // bottom of the column, so the DOM order matches the host's saved order —
  // tab order and screen-reader order follow the layout they actually see,
  // which CSS-only reordering (flex `order`) would silently break.
  //
  // `register` returns null so a declaration renders nothing where it sits.
  // A card with nothing to show registers null and is skipped.
  const panelNodes: Partial<Record<PanelId, React.ReactNode>> = {}
  const register = (id: PanelId, node: React.ReactNode) => {
    panelNodes[id] = node
    return null
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
              {/* A shared document takes over the stage area, because it IS
                  what's on the stage — there is no camera feed to sit beside
                  it yet, and once there is, the two need a real layout
                  decision rather than a squeeze. */}
              {webinar.shared_doc_url ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{webinar.shared_doc_name}</span>
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
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-slate-900 grid place-items-center text-slate-300 text-sm">
                  <div className="text-center">
                    <Camera className="mx-auto h-10 w-10 text-slate-500" />
                    <p className="mt-2">Camera preview</p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" disabled>
                  <Camera className="h-4 w-4" />
                  Test camera
                </Button>
                <Button variant="outline" disabled>
                  <MonitorUp className="h-4 w-4" />
                  Share screen
                </Button>
                <Button
                  variant="outline"
                  asChild={!docBusy}
                  disabled={docBusy}
                  title={
                    webinar.host_verified
                      ? undefined
                      : 'Verify your email first — the same code you need to go live'
                  }
                >
                  {docBusy ? (
                    <span>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </span>
                  ) : (
                    <label className="cursor-pointer">
                      <FileUp className="h-4 w-4" />
                      {webinar.shared_doc_url ? 'Replace document' : 'Share document'}
                      <input
                        type="file"
                        accept={SHARED_DOC_TYPES.join(',')}
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          e.target.value = ''
                          if (f) void shareDocument(f)
                        }}
                      />
                    </label>
                  )}
                </Button>
                {webinar.shared_doc_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={docBusy}
                    onClick={() => void stopSharingDocument()}
                  >
                    <X className="h-4 w-4" />
                    Take it down
                  </Button>
                )}
              </div>
              {docNote && (
                <p className="mt-2 text-xs text-slate-500">{docNote}</p>
              )}
              {docError && (
                <p className="mt-2 text-xs text-red-600">{docError}</p>
              )}
              {!webinar.shared_doc_url && !docError && (
                <p className="mt-2 text-xs text-slate-500">
                  PDF, PNG, JPG or WebP, up to 25 MB — everyone in the room sees
                  it. Photos and screenshots are shrunk automatically. Anyone
                  with the link can open it, so don't share anything private.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Hidden entirely when requests are switched off and nobody is
              waiting — an empty card for a feature the host has turned off is
              pure noise. A queue left over from before the toggle was flipped
              still shows, so those people don't get silently stranded. */}
          {(webinar.allow_speak_requests || speakQueue.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Hand className="h-4 w-4 text-slate-500" />
                      Speaker queue
                      {speakQueue.length > 0 && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          {speakQueue.length}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {webinar.allow_speak_requests
                        ? 'Guests raising a hand to join the conversation. Putting someone on air arrives with the live stage; until then you can clear the queue.'
                        : 'Requests are switched off — these came in beforehand.'}
                    </CardDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshSpeakQueue()}
                    title="Refresh"
                    className="mt-0.5 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {speakQueue.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No one is waiting.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {speakQueue.map((r) => (
                      <li
                        key={r.request_id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {r.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {r.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            Asked{' '}
                            {formatWithZone(
                              new Date(r.requested_at),
                              localTimezone(),
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={speakBusy === r.request_id}
                            onClick={() => void cancelSpeakRequest(r)}
                            title={`Turn down ${r.name}'s request — they can ask again`}
                            aria-label={`Turn down ${r.name}'s request`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                          >
                            {speakBusy === r.request_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={speakBusy === r.request_id}
                            onClick={() => void blockSpeaker(r)}
                            title={`Stop ${r.name} asking for the rest of the session — they stay in the room`}
                            aria-label={`Stop ${r.name} asking to speak`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          {register('room', (
            <PanelCard
              key="room"
              {...panelProps('room')}
              icon={<Settings2 className="h-4 w-4 text-slate-500" />}
              title="Room settings"
            >
              <div className="space-y-1">
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
                icon={<Lock className="h-4 w-4" />}
                label="PIN-lock the webinar"
                hint="Lands in Phase 6."
                checked={false}
                disabled
                onChange={() => {}}
              />

              {/* Seat limit lives here rather than in a card of its own: it is
                  a room rule like the toggles above it, and one number did not
                  justify its own panel. */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-start justify-between gap-3 p-2.5 pt-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-slate-500">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Seat limit</p>
                      <p className="text-xs text-slate-500">
                        {seatsLeft === null
                          ? 'Unlimited. Set a number to start a waitlist once it fills.'
                          : seatsLeft > 0
                            ? `${seatsLeft} of ${webinar.capacity} seat${webinar.capacity === 1 ? '' : 's'} left.`
                            : `Full — new sign-ups join the waitlist${waitlistedCount > 0 ? ` (${waitlistedCount} waiting)` : ''}.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="∞"
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
                      className="w-24"
                    />
                    {saving === 'capacity' && (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>
                <p className="px-2.5 text-xs text-slate-500">
                  Only approved registrants take a seat. When one frees up, the
                  longest-waiting person is let in automatically
                  {webinar.require_approval ? ' — back into your approval queue' : ''}.
                </p>
              </div>
              </div>
            </PanelCard>
          ))}

          {/* The three emails that go out on the host's behalf, lifted out of
              Room settings. They are the one group here with a consequence
              outside the room — mail landing in a stranger's inbox — and they
              were buried between "show attendee count" and a Phase 6 stub. */}
          {register('communication', (
            <PanelCard
              key="communication"
              {...panelProps('communication')}
              icon={<Mail className="h-4 w-4 text-slate-500" />}
              title="Communication"
              description="What we send your registrants, and when."
            >
              <div className="space-y-1">
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
                  icon={<MailCheck className="h-4 w-4" />}
                  label="Email a follow-up afterwards"
                  hint="Thanks to those who came, and a catch-up to those who missed it."
                  checked={webinar.send_followup}
                  disabled={saving === 'send_followup'}
                  onChange={(next) =>
                    patch({ send_followup: next }, 'send_followup')
                  }
                />
              </div>
            </PanelCard>
          ))}

          {register('openJoin', (
            <PanelCard
              key="openJoin"
              {...panelProps('openJoin')}
              icon={<DoorOpen className="h-4 w-4 text-slate-500" />}
              title="Open join link"
              description="Share this anywhere — a newsletter beforehand, or drop it in chat during the session for people who never signed up. They give a name and email at the door."
            >
            <div className="space-y-3">
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
            </div>
            </PanelCard>
          ))}

          {register('recording', (
            <PanelCard
              key="recording"
              {...panelProps('recording')}
              icon={<Video className="h-4 w-4 text-slate-500" />}
              title="Recording"
              description="Paste the link once it's up — it goes out in the follow-up email to everyone who registered, including the people who missed it."
            >
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
            </PanelCard>
          ))}

          {/* Setup-time only. The questions ARE the registration form, so they
              belong in the create flow (HostNewForm has the same editor) and
              are still editable while sign-ups are open. Once the room goes
              live or ends, nobody is filling that form in again — leaving the
              editor on screen only invites edits that can't change anything. */}
          {register('questions', webinar.status === 'scheduled' && (
            <PanelCard
              key="questions"
              {...panelProps('questions')}
              icon={<Settings2 className="h-4 w-4 text-slate-500" />}
              title="Registration questions"
              description="Asked when someone signs up. Set these before you go live."
            >
            <div className="space-y-3">
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
            </div>
            </PanelCard>
          ))}

          {register('stats', stats && (
            <PanelCard
              key="stats"
              {...panelProps('stats')}
              icon={<TrendingUp className="h-4 w-4 text-slate-500" />}
              title="How it went"
            >
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { k: 'Registered', v: stats.registered },
                    { k: 'Turned up', v: stats.attended },
                    { k: 'No-shows', v: stats.no_show },
                  ].map(({ k, v }) => (
                    <div key={k} className="rounded-lg bg-slate-50 py-2">
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                        {k}
                      </dt>
                      <dd className="text-lg font-semibold text-slate-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                {stats.registered > 0 && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    {Math.round((stats.attended / stats.registered) * 100)}% of
                    registrants attended
                    {stats.waitlisted > 0 && ` · ${stats.waitlisted} never got a seat`}
                  </p>
                )}
            </PanelCard>
          ))}

          {register('registrations', (
            <PanelCard
              key="registrations"
              {...panelProps('registrations')}
              icon={<Users className="h-4 w-4 text-slate-500" />}
              title="Registrations"
              description={
                <>
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
                  {walkUps.length > 0 && (
                    <span className="text-slate-500">
                      {' '}· {walkUps.length} walked up
                    </span>
                  )}
                </>
              }
              actions={
                <button
                  type="button"
                  onClick={reloadRegistrations}
                  disabled={refreshingRegs}
                  title="Refresh"
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', refreshingRegs && 'animate-spin')}
                  />
                </button>
              }
            >
            <>
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
                      const attended = attendedByEmail.get(r.email.toLowerCase())
                      const noShow =
                        showNoShows && !attended && r.status === 'approved'
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
                            {r.followup_sent_at && (
                              <span
                                className="inline-flex items-center gap-1 text-emerald-600"
                                title={`Post-session follow-up emailed ${new Date(r.followup_sent_at).toLocaleString()}`}
                              >
                                <MailCheck className="h-3 w-3" />
                                followed up
                              </span>
                            )}
                          </span>
                          {/* Attendance is a fact about the person, not about
                              an email, so it sits with the status chip rather
                              than in the row of send markers above. */}
                          {(attended || noShow) && (
                            <span
                              className={cn(
                                'mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                attended
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600',
                              )}
                              title={
                                attended
                                  ? `Joined ${new Date(attended.first_joined_at).toLocaleString()}${
                                      attended.last_left_at
                                        ? `, left ${new Date(attended.last_left_at).toLocaleString()}`
                                        : ''
                                    }`
                                  : 'Approved to attend, but never joined the room'
                              }
                            >
                              {attended ? (
                                <>
                                  <UserCheck className="h-3 w-3" />
                                  Attended
                                </>
                              ) : (
                                <>
                                  <UserX className="h-3 w-3" />
                                  Didn't attend
                                </>
                              )}
                            </span>
                          )}
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
                </>
              )}

              {/* Walk-ups sit outside the registrations branch on purpose: they
                  are people the registrations list can never contain, so a
                  webinar with nothing but walk-ups must still show them rather
                  than only "no one has registered yet". */}
              {walkUps.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Walk-ups · {walkUps.length}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Joined without registering — a forwarded link or your
                    newsletter, rather than the registration form.
                  </p>
                  <ul className="mt-2 max-h-48 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {walkUps.map((a) => (
                      <li key={a.email} className="flex flex-col py-2">
                        <span className="font-medium text-slate-900">{a.name}</span>
                        <span className="text-xs text-slate-500">{a.email}</span>
                        <span className="text-xs text-slate-400">
                          Joined{' '}
                          {formatWithZone(
                            new Date(a.first_joined_at),
                            localTimezone(),
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(registrations.length > 0 || walkUps.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={exportRegistrationsCsv}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </>
            </PanelCard>
          ))}

          {register('close', (
            <PanelCard
              key="close"
              {...panelProps('close')}
              icon={<Archive className="h-4 w-4 text-slate-500" />}
              title={webinar.archived_at ? 'Closed' : 'Finished with this webinar?'}
              description={
                webinar.archived_at ? (
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
                    Closing hands your token back so you can run another
                    webinar. Take your registrant list first — on the free plan
                    this webinar and everyone in it are deleted 30 days later.
                  </>
                )
              }
            >
              <div className="space-y-3">
                {registrations.length > 0 && !exported && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    You haven't exported your {registrations.length}{' '}
                    {registrations.length === 1 ? 'registrant' : 'registrants'}{' '}
                    yet. Use <strong>Export CSV</strong> above first — names,
                    emails and answers all go with it.
                  </div>
                )}
                {confirmClose ? (
                  <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-900">
                      Close “{webinar.title}”?
                    </p>
                    <p className="text-xs text-red-800">
                      Your token comes back straight away. The webinar stops
                      accepting anyone and disappears from public view. This
                      can't be undone.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={closing}
                        onClick={() => void closeWebinar()}
                      >
                        {closing ? (
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
                        disabled={closing}
                        onClick={() => setConfirmClose(false)}
                      >
                        Keep it open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setConfirmClose(true)}
                  >
                    <Archive className="h-4 w-4" />
                    Close &amp; free my token
                  </Button>
                )}
              </div>
            </PanelCard>
          ))}

          {/* Everything above only registered itself. This is what renders. */}
          {panelOrder.map((id) => panelNodes[id])}

          <button
            type="button"
            onClick={resetLayout}
            className="w-full pt-1 text-center text-xs text-slate-400 transition hover:text-slate-600"
          >
            Reset card order
          </button>
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
