import { supabase } from './supabase'
import type { CustomAnswers } from './customQuestions'
import type {
  AttendeeInsert,
  AttendeeRole,
  AttendeeRow,
  JoinTokenLookup,
  MessageRow,
  ReactionRow,
  RegistrationRow,
  SpeakRequestInsert,
  SpeakRequestRow,
  SpeakRequestStatus,
  WebinarInsert,
  WebinarRow,
  WebinarUpdate,
} from './database.types'

export async function listWebinars(): Promise<WebinarRow[]> {
  const { data, error } = await supabase
    .from('webinars')
    .select('*')
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WebinarRow[]
}

export async function getWebinarBySlug(slug: string): Promise<WebinarRow | null> {
  const { data, error } = await supabase
    .from('webinars')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data as WebinarRow | null
}

export async function createWebinar(insert: WebinarInsert): Promise<WebinarRow> {
  const { data, error } = await supabase
    .from('webinars')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw error
  return data as WebinarRow
}

export async function updateWebinar(
  id: string,
  patch: WebinarUpdate,
): Promise<WebinarRow> {
  const { data, error } = await supabase
    .from('webinars')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as WebinarRow
}

export async function deleteWebinar(id: string): Promise<void> {
  const { error } = await supabase.from('webinars').delete().eq('id', id)
  if (error) throw error
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

export async function resolveSpeakRequest(
  requestId: string,
  status: SpeakRequestStatus,
): Promise<void> {
  const { error } = await supabase
    .from('speak_requests')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}
