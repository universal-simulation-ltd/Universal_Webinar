import { supabase } from './supabase'

export type LiveKitRole = 'host' | 'speaker' | 'viewer'

export interface LiveKitTokenResult {
  token: string
  url: string
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
  if (error) throw new Error(error.message ?? 'Could not get LiveKit token')
  return data as LiveKitTokenResult
}

export function isLiveKitConfigured(): boolean {
  return Boolean(import.meta.env.VITE_LIVEKIT_URL)
}
