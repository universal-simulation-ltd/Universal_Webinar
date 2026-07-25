// Hand-written type surface for the tables we touch in Phases 2–3.
// In a later phase we can generate these from the live schema with
// `supabase gen types typescript --project-id <id>`. For now this stays small
// and explicit so the app code is fully typed without depending on a CLI step.

import type { CustomQuestion, CustomAnswers } from './customQuestions'

export type WebinarStatus = 'scheduled' | 'live' | 'ended'

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
}

export interface RegistrationInsert {
  webinar_id: string
  name: string
  email: string
  custom_answers?: CustomAnswers
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
