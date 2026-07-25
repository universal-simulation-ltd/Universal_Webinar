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
  manage_token: string
  custom_questions: CustomQuestion[]
}

export interface WebinarInsert {
  slug: string
  title: string
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
}

export interface RegistrationRow {
  id: string
  webinar_id: string
  name: string
  email: string
  registered_at: string
  custom_answers: CustomAnswers
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
