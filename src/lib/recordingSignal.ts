import { useEffect, useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent, type Room } from 'livekit-client'

// How everyone in the room learns that the session is being recorded.
//
//   • Recording in the host's browser: the host sets the attribute below on its
//     own LiveKit participant. Attributes reach everyone already in the room
//     and everyone who joins later, and go away with the host — so a host whose
//     tab crashes doesn't leave a stale badge behind.
//   • Recording in the cloud (LiveKit Egress): LiveKit itself sets
//     room.isRecording for every participant.
//
// Only the host may set the flag: the token function grants
// canUpdateOwnMetadata to the host alone, and only a participant whose identity
// is `host-<slug>` is believed. Guests' identities are attendee ids, so nobody
// else can claim to be recording — or claim that a recording has stopped.

export const RECORDING_ATTRIBUTE = 'recording'
export const HOST_IDENTITY_PREFIX = 'host-'

export function roomIsRecording(room: Room): boolean {
  if (room.isRecording) return true
  const participants = [room.localParticipant, ...room.remoteParticipants.values()]
  return participants.some(
    (p) => p.identity.startsWith(HOST_IDENTITY_PREFIX) && !!p.attributes?.[RECORDING_ATTRIBUTE],
  )
}

/** Must be rendered inside a <LiveKitRoom>. */
export function useRoomRecording(): boolean {
  const room = useRoomContext()
  const [recording, setRecording] = useState(() => roomIsRecording(room))
  useEffect(() => {
    const update = () => setRecording(roomIsRecording(room))
    update()
    const events = [
      RoomEvent.ParticipantAttributesChanged,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.RecordingStatusChanged,
      RoomEvent.Connected,
      RoomEvent.Reconnected,
      RoomEvent.Disconnected,
    ] as const
    for (const e of events) room.on(e, update)
    return () => {
      for (const e of events) room.off(e, update)
    }
  }, [room])
  return recording
}
