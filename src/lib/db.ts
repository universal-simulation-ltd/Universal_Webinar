import { supabase } from './supabase'
import { localTimezone } from './time'
import type { CustomAnswers } from './customQuestions'
import type {
  AttendanceRow,
  AttendeeInsert,
  AttendeeRole,
  AttendeeRow,
  JoinTokenLookup,
  MessageRow,
  RegistrationStatus,
  ReactionRow,
  RegistrationRow,
  SpeakQueueRow,
  SpeakRequestInsert,
  SpeakRequestRow,
  SpeakRequestStatus,
  WebinarInsert,
  WebinarRow,
  WebinarUpdate,
  WebinarWithManageToken,
} from './database.types'

// Every column of `webinars` except the host's secret `manage_token`, which
// migration 0067 revokes from anon + authenticated at the column level. `*` is
// no longer usable: PostgREST passes it through as a bare SQL `*`, which now
// fails with "permission denied for column manage_token". Keep this list in
// step with WebinarRow — a column missing here is simply absent at runtime.
export const WEBINAR_COLUMN_NAMES = [
  'id',
  'slug',
  'title',
  'description',
  'scheduled_at',
  'started_at',
  'ended_at',
  'status',
  'allow_speak_requests',
  'show_guest_count',
  'recording_url',
  'created_at',
  'updated_at',
  'created_by',
  'host_name',
  'host_email',
  'company_name',
  'logo_url',
  'host_verified',
  'custom_questions',
  'send_confirmation',
  'send_reminders',
  'require_approval',
  'capacity',
  'send_followup',
  'open_join',
  'archived_at',
  'purge_after',
  'shared_doc_url',
  'shared_doc_name',
  'kept_at',
  // `pin_required` yes, `entry_pin` NEVER — the latter is revoked from anon and
  // authenticated (0102), so naming it here would fail the whole select the way
  // `select *` does with manage_token.
  'pin_required',
] as const

/** The same list as a PostgREST select string. */
export const WEBINAR_COLUMNS = WEBINAR_COLUMN_NAMES.join(', ')

/**
 * Narrow a raw `webinars` row from a Realtime `postgres_changes` payload down
 * to the columns this app actually reads.
 *
 * ⚠️ A CDC payload is **not** filtered by WEBINAR_COLUMNS. It carries every
 * column the *database* grants the subscriber — which today happens to be
 * exactly these 32, because migrations 0067/0068/0102 revoke `manage_token` and
 * `entry_pin` and `sync_webinar_public_column_grants()` keeps the rest granted.
 * The two lists are maintained by different things, though, so the next column
 * added to the table arrives here whether or not anyone adds it to
 * WEBINAR_COLUMN_NAMES. Picking rather than casting is what keeps a realtime
 * row and a `select` row the same shape.
 *
 * Returns a Partial deliberately: merge it over the row you already have rather
 * than replacing it, so a column that is absent from the payload (revoked, or
 * an older database) leaves the last known value alone instead of blanking it.
 */
export function webinarRowFromRealtime(
  row: Record<string, unknown>,
): Partial<WebinarRow> {
  const picked: Record<string, unknown> = {}
  for (const name of WEBINAR_COLUMN_NAMES) {
    if (name in row) picked[name] = row[name]
  }
  return picked as Partial<WebinarRow>
}

export async function listWebinars(): Promise<WebinarRow[]> {
  const { data, error } = await supabase
    .from('webinars')
    .select(WEBINAR_COLUMNS)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as WebinarRow[]
}

export async function getWebinarBySlug(slug: string): Promise<WebinarRow | null> {
  const { data, error } = await supabase
    .from('webinars')
    .select(WEBINAR_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data as WebinarRow | null
}

// The manage token can't be read back out of the table any more, so the client
// mints it here and hands it to the INSERT rather than letting the column
// default fire. crypto.randomUUID() is CSPRNG-backed and gives the same 122
// bits as gen_random_uuid(); choosing your own token can only ever weaken a
// webinar you are creating yourself, and the update RPC strips the column from
// its patch, so it stays unforgeable for anyone else's row.
export async function createWebinar(
  insert: WebinarInsert,
): Promise<WebinarWithManageToken> {
  const manageToken = insert.manage_token ?? crypto.randomUUID()
  const { data, error } = await supabase
    .from('webinars')
    .insert({ ...insert, manage_token: manageToken })
    .select(WEBINAR_COLUMNS)
    .single()
  if (error) throw error
  // A brand-new webinar has no PIN — the select can't read `entry_pin` back
  // (0102 revokes it), and there is nothing to read.
  return {
    ...(data as unknown as WebinarRow),
    manage_token: manageToken,
    entry_pin: null,
  }
}

export async function updateWebinar(
  id: string,
  patch: WebinarUpdate,
): Promise<WebinarRow> {
  const { data, error } = await supabase
    .from('webinars')
    .update(patch)
    .eq('id', id)
    .select(WEBINAR_COLUMNS)
    .single()
  if (error) throw error
  return data as unknown as WebinarRow
}

// Returns how many rows were actually removed. PostgREST reports an RLS-denied
// DELETE as a *success with zero rows*, not an error — so without reading the
// count back, a caller cannot tell "removed" from "not allowed to remove", and
// the rollback in HostNewForm would report success having done nothing. (Same
// trap on UPDATE: an anon/guest session silently updates zero rows.)
export async function deleteWebinar(id: string): Promise<number> {
  const { data, error } = await supabase
    .from('webinars')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

export async function countRegistrations(webinarId: string): Promise<number> {
  const { count, error } = await supabase
    .from('registrations')
    .select('id', { head: true, count: 'exact' })
    .eq('webinar_id', webinarId)
  if (error) throw error
  return count ?? 0
}

export async function listRegistrations(
  webinarId: string,
): Promise<RegistrationRow[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('webinar_id', webinarId)
    .order('registered_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as RegistrationRow[]
}

// Unverified hosts (token-only, no auth session) read their registrations
// through a security-definer RPC — the `manage_token` is the authorisation, the
// same pattern as `updateWebinarByToken`. Returns the full list newest-first.
export async function listRegistrationsByToken(
  slug: string,
  token: string,
): Promise<RegistrationRow[]> {
  const { data, error } = await supabase.rpc('list_registrations_by_token', {
    p_slug: slug,
    p_token: token,
  })
  if (error) throw error
  return (data ?? []) as RegistrationRow[]
}

// Anonymous guests have INSERT permission on registrations but no SELECT, so
// we can't do INSERT ... RETURNING. Plain insert + treat "already registered"
// (unique_violation, Postgres SQLSTATE 23505) as a successful no-op.
export async function registerForWebinar(
  webinarId: string,
  name: string,
  email: string,
  customAnswers?: CustomAnswers,
): Promise<void> {
  const trimmedEmail = email.trim().toLowerCase()
  const { error } = await supabase.from('registrations').insert({
    webinar_id: webinarId,
    name: name.trim(),
    email: trimmedEmail,
    // Captured so their confirmation / reminder emails can speak in their own
    // local time rather than hedging in UTC. Best-effort: a browser that won't
    // tell us leaves it null and those emails fall back to UTC.
    timezone: localTimezone(),
    ...(customAnswers && Object.keys(customAnswers).length > 0
      ? { custom_answers: customAnswers }
      : {}),
  })
  if (error) {
    if (error.code === '23505') return
    throw error
  }
}

// Ask the backend to email this registrant their confirmation (session details,
// a .ics invite, and their own join link). The edge function does all the
// gating: it checks the host opted in, that a registration really exists for
// this webinar + email, and that one hasn't already been sent.
//
// Deliberately NEVER throws. A confirmation email is a nice-to-have on top of a
// registration that has already been saved — if the provider is down, or the
// function isn't deployed in a self-hosted setup, the guest is still registered
// and the page still shows them their join link.
export async function sendRegistrationConfirmation(
  webinarId: string,
  email: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke(
      'send-webinar-confirmation',
      { body: { webinarId, email: email.trim().toLowerCase() } },
    )
    if (error) return false
    return (data as { sent?: boolean } | null)?.sent === true
  } catch {
    return false
  }
}

// Exchange the `?t=` token from a confirmation email for that registrant's own
// details, so their personal link drops them straight into the "you're in"
// state on any device. Returns null for an unknown/expired token.
export async function getRegistrationByJoinToken(
  token: string,
): Promise<JoinTokenLookup | null> {
  const { data, error } = await supabase.rpc('get_registration_by_join_token', {
    p_token: token,
  })
  if (error) throw error
  const rows = (data ?? []) as JoinTokenLookup[]
  return rows[0] ?? null
}

// How many seats are left, or null when the webinar is uncapped. Anon has no
// SELECT on registrations so it can't count approved rows itself — this RPC is
// the only way for the register page to know a room is full before submitting.
export async function getWebinarFreeSeats(
  webinarId: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc('webinar_free_seats', {
    p_webinar_id: webinarId,
  })
  if (error) throw error
  return (data as number | null) ?? null
}

export interface WebinarStats {
  registered: number
  approved: number
  pending: number
  waitlisted: number
  declined: number
  attended: number
  no_show: number
}

// What the host would be giving up by closing. Attendance isn't otherwise
// readable through a manage token, and it's the half that makes the summary
// worth reading.
export async function getWebinarStatsByToken(
  slug: string,
  token: string,
): Promise<WebinarStats | null> {
  const { data, error } = await supabase.rpc('webinar_stats_by_token', {
    p_slug: slug,
    p_token: token,
  })
  if (error) throw error
  const rows = (data ?? []) as WebinarStats[]
  return rows[0] ?? null
}

// The per-person counterpart of getWebinarStatsByToken's `attended` count.
// Same token authorisation, and deliberately the same definition of attendance
// (lowercased email) so the list and the count above it can't disagree.
export async function getWebinarAttendanceByToken(
  slug: string,
  token: string,
): Promise<AttendanceRow[]> {
  const { data, error } = await supabase.rpc('webinar_attendance_by_token', {
    p_slug: slug,
    p_token: token,
  })
  if (error) throw error
  return (data ?? []) as AttendanceRow[]
}

// ──────────────────────────────────────────────────────────────────────────────
// Speaker queue, for a manage-token host (migrations 0097 + 0105)
//
// The `speak_requests` policies are all `to authenticated`, so none of the
// functions further down this file work for a host who only holds a manage
// token. These are their token-gated equivalents: 0097 brought the queue,
// cancel and block; 0105 added putting someone on air and taking them off it.
// ──────────────────────────────────────────────────────────────────────────────

export async function listSpeakQueueByToken(
  slug: string,
  token: string,
): Promise<SpeakQueueRow[]> {
  const { data, error } = await supabase.rpc('list_speak_requests_by_token', {
    p_slug: slug,
    p_token: token,
  })
  if (error) throw error
  return (data ?? []) as SpeakQueueRow[]
}

/** Turn down one request. The guest can ask again — use the block for "stop". */
export async function denySpeakRequestByToken(
  slug: string,
  token: string,
  requestId: string,
): Promise<void> {
  const { error } = await supabase.rpc('deny_speak_request_by_token', {
    p_slug: slug,
    p_token: token,
    p_request_id: requestId,
  })
  if (error) throw error
}

/**
 * Put this raised hand on air (migration 0105).
 *
 * Promotion is the whole mechanism: `livekit-token` mints a publish-capable
 * token for an attendee whose role is 'speaker'. Returns the updated attendee
 * row. Throws — loudly and with a sentence worth showing — when the request is
 * already resolved, or the person is blocked, banned, or gone.
 *
 * Resolves every pending request from that person, not just this one, so the
 * caller should drop the whole attendee from its queue.
 */
export async function approveSpeakRequestByToken(
  slug: string,
  token: string,
  requestId: string,
): Promise<AttendeeRow> {
  const { data, error } = await supabase.rpc('approve_speak_request_by_token', {
    p_slug: slug,
    p_token: token,
    p_request_id: requestId,
  })
  if (error) throw error
  return data as AttendeeRow
}

/** Take a speaker back off air — down to a plain viewer, still in the room.
 *  Does NOT block them from asking again; that is a separate control. */
export async function revokeSpeakerByToken(
  slug: string,
  token: string,
  attendeeId: string,
): Promise<AttendeeRow> {
  const { data, error } = await supabase.rpc('revoke_speaker_by_token', {
    p_slug: slug,
    p_token: token,
    p_attendee_id: attendeeId,
  })
  if (error) throw error
  return data as AttendeeRow
}

/** Who is on air right now. The queue RPC only returns *pending* requests, so
 *  without this the host loses track of their speakers on a page reload. */
export async function listSpeakersByToken(
  slug: string,
  token: string,
): Promise<AttendeeRow[]> {
  const { data, error } = await supabase.rpc('list_speakers_by_token', {
    p_slug: slug,
    p_token: token,
  })
  if (error) throw error
  return (data ?? []) as AttendeeRow[]
}

/**
 * Stop (or let) this attendee ask to speak for the rest of the session.
 * Blocking also clears anything they have pending. Reversible, and NOT a ban:
 * they carry on watching and chatting.
 */
export async function setSpeakBlockByToken(
  slug: string,
  token: string,
  attendeeId: string,
  blocked: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_speak_block_by_token', {
    p_slug: slug,
    p_token: token,
    p_attendee_id: attendeeId,
    p_blocked: blocked,
  })
  if (error) throw error
}

// Close the webinar: archives it and returns the host's token so they can run
// another. Irreversible from the app's side — the row is destroyed 30 days
// later on the free tier.
export async function archiveWebinarByToken(
  slug: string,
  token: string,
): Promise<WebinarRow> {
  const { data, error } = await supabase.rpc('archive_webinar_by_token', {
    p_slug: slug,
    p_token: token,
  })
  if (error) throw error
  return data as WebinarRow
}

// Host approves / waitlists / declines a registrant, authorised by the manage
// token (the same pattern as updateWebinarByToken). Returns the updated row so
// the panel can re-render without a refetch.
export async function setRegistrationStatusByToken(
  slug: string,
  token: string,
  registrationId: string,
  status: RegistrationStatus,
): Promise<RegistrationRow> {
  const { data, error } = await supabase.rpc('set_registration_status_by_token', {
    p_slug: slug,
    p_token: token,
    p_registration_id: registrationId,
    p_status: status,
  })
  if (error) throw error
  return data as RegistrationRow
}

// ──────────────────────────────────────────────────────────────────────────────
// Attendees
// ──────────────────────────────────────────────────────────────────────────────

export async function getMyAttendee(
  webinarId: string,
): Promise<AttendeeRow | null> {
  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) return null
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
    .eq('webinar_id', webinarId)
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as AttendeeRow | null
}

/**
 * Pre-flight for the join form (migration 0103): is this the right PIN?
 *
 * NOT the enforcement point — the attendee trigger is, and it can't be talked
 * out of it. This exists so a wrong PIN is rejected *before* the form registers
 * the person typing it, which would otherwise put someone who never got in on
 * the host's list and in the follow-up mailing.
 *
 * Returns true for a webinar with no PIN, so the caller can ask unconditionally.
 */
export async function webinarPinMatches(
  slug: string,
  pin: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('webinar_pin_matches', {
    p_slug: slug,
    p_pin: pin,
  })
  if (error) throw error
  return data === true
}

/**
 * Enter a PIN-locked room (migration 0102).
 *
 * The plain insert below cannot be used for these — the attendee trigger
 * refuses it unless this RPC has cleared the PIN in the same transaction, so a
 * PIN gate can't be walked around from the console. Idempotent: a reload gets
 * the existing attendee row back.
 */
export async function joinWebinarWithPin(
  slug: string,
  pin: string,
  name: string,
  email: string,
): Promise<AttendeeRow> {
  const { data, error } = await supabase.rpc('join_webinar_with_pin', {
    p_slug: slug,
    p_pin: pin,
    p_name: name,
    p_email: email,
  })
  if (error) throw error
  return data as AttendeeRow
}

export async function joinAsAttendee(
  insert: AttendeeInsert,
): Promise<AttendeeRow> {
  const { data, error } = await supabase
    .from('attendees')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw error
  return data as AttendeeRow
}

// ──────────────────────────────────────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────────────────────────────────────

export async function listMessages(webinarId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('webinar_id', webinarId)
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) throw error
  return (data ?? []) as MessageRow[]
}

export async function sendMessage(
  webinarId: string,
  attendeeId: string,
  content: string,
): Promise<void> {
  const trimmed = content.trim()
  if (trimmed.length === 0) return
  const { error } = await supabase.from('messages').insert({
    webinar_id: webinarId,
    attendee_id: attendeeId,
    content: trimmed.slice(0, 1000),
  })
  if (error) throw error
}

export async function softDeleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by_admin: true,
    })
    .eq('id', messageId)
  if (error) throw error
}

// ──────────────────────────────────────────────────────────────────────────────
// Reactions
// ──────────────────────────────────────────────────────────────────────────────

export async function listReactionsForWebinar(
  webinarId: string,
): Promise<ReactionRow[]> {
  // Reactions don't carry webinar_id; join through messages.
  const { data, error } = await supabase
    .from('reactions')
    .select('*, messages!inner(webinar_id)')
    .eq('messages.webinar_id', webinarId)
  if (error) throw error
  return ((data ?? []) as unknown as ReactionRow[])
}

export async function addReaction(
  messageId: string,
  attendeeId: string,
  emoji: string,
): Promise<void> {
  const { error } = await supabase.from('reactions').insert({
    message_id: messageId,
    attendee_id: attendeeId,
    emoji,
  })
  // 23505 = already reacted with this emoji; treat as no-op
  if (error && error.code !== '23505') throw error
}

export async function removeReaction(
  messageId: string,
  attendeeId: string,
  emoji: string,
): Promise<void> {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('attendee_id', attendeeId)
    .eq('emoji', emoji)
  if (error) throw error
}

// ──────────────────────────────────────────────────────────────────────────────
// Attendee moderation (admin only)
// ──────────────────────────────────────────────────────────────────────────────

export async function listAttendees(webinarId: string): Promise<AttendeeRow[]> {
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
    .eq('webinar_id', webinarId)
    .is('left_at', null)
    .order('joined_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as AttendeeRow[]
}

export async function muteAttendee(
  attendeeId: string,
  muted: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('attendees')
    .update({ muted_by_admin: muted })
    .eq('id', attendeeId)
  if (error) throw error
}

export async function setAttendeeRole(
  attendeeId: string,
  role: AttendeeRole,
): Promise<void> {
  const { error } = await supabase
    .from('attendees')
    .update({ role })
    .eq('id', attendeeId)
  if (error) throw error
}

export async function kickAttendee(attendeeId: string): Promise<void> {
  const { error } = await supabase
    .from('attendees')
    .update({ left_at: new Date().toISOString() })
    .eq('id', attendeeId)
  if (error) throw error
}

// ──────────────────────────────────────────────────────────────────────────────
// Speak requests
// ──────────────────────────────────────────────────────────────────────────────

export async function listSpeakRequests(
  webinarId: string,
): Promise<SpeakRequestRow[]> {
  const { data, error } = await supabase
    .from('speak_requests')
    .select('*')
    .eq('webinar_id', webinarId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SpeakRequestRow[]
}

export async function raiseSpeakRequest(
  insert: SpeakRequestInsert,
): Promise<SpeakRequestRow> {
  const { data, error } = await supabase
    .from('speak_requests')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw error
  return data as SpeakRequestRow
}

/**
 * The admin control room's approve / deny. Goes through migration 0004's
 * `resolve_speak_request`, which resolves the request AND moves the attendee's
 * role in one transaction.
 *
 * ⚠️ This used to be a plain `update` on `speak_requests`, which meant the
 * admin room's **Approve button never actually promoted anybody** — it marked
 * the request approved and left `attendees.role` as 'guest', so the person was
 * never given a publish-capable LiveKit token. The RPC has existed in prod
 * since Phase 4 (verified 2026-08-05); it simply wasn't being called. The
 * host-side equivalent is `approveSpeakRequestByToken` (migration 0105).
 *
 * Admin-only by `is_admin()` inside the function — which is also why the old
 * table update was doubly untrustworthy: PostgREST reports an RLS-denied
 * UPDATE as a success with zero rows, so a denial would have looked identical
 * to success. An RPC raises.
 */
export async function resolveSpeakRequest(
  requestId: string,
  status: SpeakRequestStatus,
): Promise<void> {
  const { error } = await supabase.rpc('resolve_speak_request', {
    p_request_id: requestId,
    p_status: status,
  })
  if (error) throw error
}
