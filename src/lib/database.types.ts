// Hand-written type surface for the tables we touch in Phases 2–3.
// In a later phase we can generate these from the live schema with
// `supabase gen types typescript --project-id <id>`. For now this stays small
// and explicit so the app code is fully typed without depending on a CLI step.

import type { CustomQuestion, CustomAnswers } from './customQuestions'

export type WebinarStatus = 'scheduled' | 'live' | 'ended'

// Phase 6. Only 'approved' can create an attendee row (enforced by a trigger,
// not by this type) — everything else is held at the door.
export type RegistrationStatus =
  | 'pending'
  | 'approved'
  | 'waitlisted'
  | 'declined'

export interface WebinarRow {
  id: string
  slug: string
  title: string
  description: string
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  status: WebinarStatus
  allow_speak_requests: boolean
  show_guest_count: boolean
  recording_url: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  host_name: string | null
  host_email: string | null
  company_name: string | null
  logo_url: string | null
  host_verified: boolean
  custom_questions: CustomQuestion[]
  send_confirmation: boolean
  send_reminders: boolean
  require_approval: boolean
  // Phase 7. null = unlimited. Only `approved` registrations occupy a seat.
  capacity: number | null
  send_followup: boolean
  // Phase 8. The walk-up door at /w/<slug>. Default on; the host can shut it
  // mid-session without affecting anyone who already registered.
  open_join: boolean
  // Closing a webinar archives it and hands the host's token back. purge_after
  // is when the row is actually destroyed — null means kept indefinitely (a
  // paying host), otherwise 30 days after closing.
  archived_at: string | null
  purge_after: string | null
  // The document currently on the stage (migration 0098), or null for none.
  // Uploaded to the public `webinar-docs` bucket by an OTP-verified host.
  shared_doc_url: string | null
  shared_doc_name: string | null
  // The host chose "save to cloud" on the wrap-up (migration 0099): keep this
  // webinar and its registrations indefinitely, and keep holding the token —
  // which is why it is NOT archived_at. Cleared when they finally close.
  kept_at: string | null
}

// `manage_token` is deliberately absent from WebinarRow. Migration 0067 revokes
// it from anon + authenticated at the column level, so no read of the base
// table can ever return it — a stray `webinar.manage_token` should be a type
// error, not a silent undefined. It reaches the browser in exactly two places,
// both of which already hold the token: the client mints it at creation time
// (createWebinar), and update_webinar_by_token echoes the row back.
export interface WebinarWithManageToken extends WebinarRow {
  manage_token: string
}

export interface WebinarInsert {
  slug: string
  title: string
  // Optional: createWebinar mints one when it isn't supplied. See db.ts.
  manage_token?: string
  description?: string
  scheduled_at?: string | null
  status?: WebinarStatus
  allow_speak_requests?: boolean
  show_guest_count?: boolean
  created_by?: string | null
  host_name?: string | null
  host_email?: string | null
  company_name?: string | null
  logo_url?: string | null
  custom_questions?: CustomQuestion[]
  send_confirmation?: boolean
  send_reminders?: boolean
  require_approval?: boolean
  capacity?: number | null
  send_followup?: boolean
  open_join?: boolean
}

export interface WebinarUpdate {
  slug?: string
  title?: string
  description?: string
  scheduled_at?: string | null
  started_at?: string | null
  ended_at?: string | null
  status?: WebinarStatus
  allow_speak_requests?: boolean
  show_guest_count?: boolean
  recording_url?: string | null
  host_name?: string | null
  company_name?: string | null
  logo_url?: string | null
  custom_questions?: CustomQuestion[]
  send_confirmation?: boolean
  send_reminders?: boolean
  require_approval?: boolean
  capacity?: number | null
  send_followup?: boolean
  open_join?: boolean
  shared_doc_url?: string | null
  shared_doc_name?: string | null
  kept_at?: string | null
}

export interface RegistrationRow {
  id: string
  webinar_id: string
  name: string
  email: string
  registered_at: string
  custom_answers: CustomAnswers
  // Per-registrant join token (migration 0065). Only ever readable by the host
  // (via list_registrations_by_token) and the send-webinar-confirmation function
  // — the registrant themselves gets it in their confirmation email, never from
  // an API response, because anon has no SELECT on registrations.
  join_token: string
  confirmation_sent_at: string | null
  // Phase 5 reminder slots (migration 0066). Written only by the scheduled
  // process-webinar-reminders sweep; each stamp is that slot's idempotency
  // guard, so a null means "still due", not "never happening".
  reminder_24h_sent_at: string | null
  reminder_1h_sent_at: string | null
  followup_sent_at: string | null
  // IANA zone from the registrant's browser at sign-up (migration 0075), used
  // to localise their emails. Null = never learned, emails fall back to UTC.
  timezone: string | null
  // Phase 6 approval gating (migration 0070). Set by a BEFORE INSERT trigger
  // from the webinar's require_approval, never by the client — a payload
  // claiming 'approved' is overridden server-side.
  status: RegistrationStatus
}

// What the anon registrant gets back when they exchange the `?t=` token from
// their confirmation email — their own registration and nothing else.
export interface JoinTokenLookup {
  registration_id: string
  webinar_id: string
  slug: string
  name: string
  email: string
  registered_at: string
  status: RegistrationStatus
}

export interface RegistrationInsert {
  webinar_id: string
  name: string
  email: string
  custom_answers?: CustomAnswers
  timezone?: string | null
}

// A pending speak request as the HOST sees it — the raw row is two ids, so the
// token RPC joins the attendee on (migration 0097).
export interface SpeakQueueRow {
  request_id: string
  attendee_id: string
  name: string
  email: string
  requested_at: string
}

// What a manage-token host can learn about who turned up (migration 0096).
// One row per PERSON rather than per attendee row — rejoining after a dropout
// inserts a second row, and the RPC collapses those by lowercased email.
// `last_left_at` is null while they are still in the room.
export interface AttendanceRow {
  name: string
  email: string
  first_joined_at: string
  last_left_at: string | null
}

export type AttendeeRole = 'guest' | 'speaker' | 'banned'

export interface AttendeeRow {
  id: string
  webinar_id: string
  registration_id: string | null
  name: string
  email: string
  role: AttendeeRole
  muted_by_admin: boolean
  // Host has stopped this person requesting to speak (migration 0097). NOT a
  // ban — they keep watching and chatting. A trigger enforces it server-side,
  // so hiding the button is a courtesy, not the control.
  speak_blocked: boolean
  livekit_identity: string | null
  joined_at: string
  left_at: string | null
  auth_user_id: string | null
}

export interface AttendeeInsert {
  webinar_id: string
  name: string
  email: string
  auth_user_id: string
  registration_id?: string | null
}

export interface MessageRow {
  id: string
  webinar_id: string
  attendee_id: string | null
  author_name: string | null
  content: string
  created_at: string
  deleted_at: string | null
  deleted_by_admin: boolean
}

export interface MessageInsert {
  webinar_id: string
  attendee_id: string
  content: string
}

export interface ReactionRow {
  id: string
  message_id: string
  attendee_id: string
  emoji: string
  created_at: string
}

export type SpeakRequestStatus = 'pending' | 'approved' | 'denied' | 'revoked'

export interface SpeakRequestRow {
  id: string
  webinar_id: string
  attendee_id: string
  status: SpeakRequestStatus
  created_at: string
  resolved_at: string | null
}

export interface SpeakRequestInsert {
  webinar_id: string
  attendee_id: string
}

export interface Database {
  public: {
    Tables: {
      webinars: {
        Row: WebinarRow
        Insert: WebinarInsert
        Update: WebinarUpdate
        Relationships: []
      }
      registrations: {
        Row: RegistrationRow
        Insert: RegistrationInsert
        Update: Partial<RegistrationInsert>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      webinar_status: WebinarStatus
    }
    CompositeTypes: Record<never, never>
  }
}
