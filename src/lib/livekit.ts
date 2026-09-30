import { supabase } from './supabase'

export type LiveKitRole = 'host' | 'speaker' | 'viewer'

/** Set only for a FREE webinar (universal-platform 0202). */
export interface FreeWebinarLimits {
  max_people: number | null
  max_minutes: number | null
  /** ISO time the free webinar's time runs out; null until it has started. */
  ends_at: string | null
}

export interface LiveKitTokenResult {
  token: string
  url: string
  free_limits?: FreeWebinarLimits | null
}

/** A refusal the person should read — a free webinar's cap, not a fault. */
export class LiveKitLimitError extends Error {
  constructor(message: string, readonly code: 'free_room_full' | 'free_time_limit') {
    super(message)
  }
}

export async function getLiveKitToken(
  webinarId: string,
  attendeeId: string | null,
  role: LiveKitRole,
  /**
   * Required for `host`, ignored otherwise. The host credential is the manage
   * token, not a session — see the function's header for why relying on a
   * session here was the bug that kept "Your stage" a placeholder.
   */
  manageToken?: string | null,
): Promise<LiveKitTokenResult> {
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: {
      webinar_id: webinarId,
      attendee_id: attendeeId,
      role,
      manage_token: manageToken ?? null,
    },
  })
  if (error) {
    // A non-2xx reply carries the function's JSON body on error.context.
    let body: { error?: string; max_people?: number; max_minutes?: number } | null = null
    try {
      body = await (error as { context?: Response }).context?.json() ?? null
    } catch { /* not JSON */ }
    if (body?.error === 'free_room_full') {
      throw new LiveKitLimitError(
        `This free webinar is full — free webinars can have up to ${body.max_people ?? 25} people.`,
        'free_room_full',
      )
    }
    if (body?.error === 'free_time_limit') {
      throw new LiveKitLimitError(
        `This free webinar has reached its ${body.max_minutes ?? 90}-minute limit.`,
        'free_time_limit',
      )
    }
    throw new Error(error.message ?? 'Could not get LiveKit token')
  }
  return data as LiveKitTokenResult
}

export function isLiveKitConfigured(): boolean {
  return Boolean(import.meta.env.VITE_LIVEKIT_URL)
}
