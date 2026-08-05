import type { RealtimeChannel, RealtimeChannelSendResponse } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AttendeeRow, MessageRow, ReactionRow, SpeakRequestRow } from './database.types'

export interface FloatingReactionPayload {
  emoji: string
  fromName: string
}

export interface WebinarChannelHandlers {
  onMessageInsert?: (row: MessageRow) => void
  onMessageUpdate?: (row: MessageRow) => void
  onReactionInsert?: (row: ReactionRow) => void
  onReactionDelete?: (id: string) => void
  onFloatingReaction?: (payload: FloatingReactionPayload) => void
  onPresence?: (count: number) => void
  onAttendeeUpdate?: (row: AttendeeRow) => void
  onSpeakRequestInsert?: (row: SpeakRequestRow) => void
  onSpeakRequestUpdate?: (row: SpeakRequestRow) => void
  /**
   * The webinar row itself changed — the host put a document on the stage, went
   * live, locked the room, and so on.
   *
   * ⚠️ Deliberately NOT typed as `WebinarRow`. A CDC payload is filtered by the
   * subscriber's **column grants**, not by `WEBINAR_COLUMNS`, so its key set is
   * decided by the database rather than by `db.ts`. Put it through
   * `webinarRowFromRealtime` to get back the shape a `select` would have
   * returned. (Verified against prod 2026-08-05: the grants keep `manage_token`
   * and `entry_pin` out of the payload — that is what makes this subscription
   * safe on a guest-facing page at all.)
   */
  onWebinarUpdate?: (row: Record<string, unknown>) => void
  /**
   * Fired on every successful (re)subscribe — the first one, and again each
   * time the socket drops and the client rejoins. The place to hang a refetch,
   * so an outage costs one stale window rather than the rest of the session.
   */
  onSubscribed?: () => void
}

export interface PresenceTrack {
  attendeeId: string
  name: string
}

// One channel carries everything for a webinar:
// - Postgres CDC for messages, reactions, attendees, speak requests, and the
//   webinar row itself
// - Broadcast for ephemeral floating reactions (no DB write)
// - Presence for the live attendee count
//
// Everything goes on this one channel on purpose: a second channel per webinar
// would be a second socket join, a second set of RLS checks per event, and one
// more thing to tear down.
export function joinWebinarChannel(
  webinarId: string,
  presence: PresenceTrack | null,
  handlers: WebinarChannelHandlers,
): RealtimeChannel {
  const channel = supabase.channel(`webinar:${webinarId}`, {
    config: {
      presence: { key: presence?.attendeeId ?? 'observer' },
      broadcast: { self: false },
    },
  })

  if (handlers.onMessageInsert || handlers.onMessageUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `webinar_id=eq.${webinarId}`,
      },
      (payload) => handlers.onMessageInsert?.(payload.new as MessageRow),
    )
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `webinar_id=eq.${webinarId}`,
      },
      (payload) => handlers.onMessageUpdate?.(payload.new as MessageRow),
    )
  }

  if (handlers.onReactionInsert || handlers.onReactionDelete) {
    // Reactions don't carry webinar_id directly — filter client-side via the
    // current message set in the caller.
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reactions' },
      (payload) => handlers.onReactionInsert?.(payload.new as ReactionRow),
    )
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'reactions' },
      (payload) => {
        const id = (payload.old as { id?: string } | null)?.id
        if (id) handlers.onReactionDelete?.(id)
      },
    )
  }

  if (handlers.onFloatingReaction) {
    channel.on('broadcast', { event: 'floating' }, ({ payload }) => {
      handlers.onFloatingReaction?.(payload as FloatingReactionPayload)
    })
  }

  if (handlers.onAttendeeUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'attendees',
        filter: `webinar_id=eq.${webinarId}`,
      },
      (payload) => handlers.onAttendeeUpdate?.(payload.new as AttendeeRow),
    )
  }

  if (handlers.onSpeakRequestInsert || handlers.onSpeakRequestUpdate) {
    if (handlers.onSpeakRequestInsert) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'speak_requests',
          filter: `webinar_id=eq.${webinarId}`,
        },
        (payload) => handlers.onSpeakRequestInsert?.(payload.new as SpeakRequestRow),
      )
    }
    if (handlers.onSpeakRequestUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'speak_requests',
          filter: `webinar_id=eq.${webinarId}`,
        },
        (payload) => handlers.onSpeakRequestUpdate?.(payload.new as SpeakRequestRow),
      )
    }
  }

  if (handlers.onWebinarUpdate) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'webinars',
        filter: `id=eq.${webinarId}`,
      },
      (payload) =>
        handlers.onWebinarUpdate?.(payload.new as Record<string, unknown>),
    )
  }

  if (handlers.onPresence) {
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      handlers.onPresence?.(Object.keys(state).length)
    })
  }

  channel.subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') return
    if (presence) {
      await channel.track({ name: presence.name })
    }
    // Also fires after a reconnect, which is the point — see onSubscribed.
    handlers.onSubscribed?.()
  })

  return channel
}

export function broadcastFloatingReaction(
  channel: RealtimeChannel,
  payload: FloatingReactionPayload,
): Promise<RealtimeChannelSendResponse> {
  return channel.send({
    type: 'broadcast',
    event: 'floating',
    payload,
  })
}

export async function leaveChannel(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe()
  await supabase.removeChannel(channel)
}
