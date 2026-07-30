import { useState } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useConnectionState,
  VideoTrack,
  useTracks,
} from '@livekit/components-react'
import { ConnectionState, Track } from 'livekit-client'
import { Camera, CameraOff, Loader2, Mic, MicOff, MonitorUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CameraBubble } from '@/components/CameraBubble'
import { cn } from '@/lib/utils'

/**
 * The host's end of the stage: connect, publish, and see what the room sees.
 *
 * Nothing here starts on its own. Joining a LiveKit room grabs the camera and
 * the microphone, and doing that the moment a host opens their management page
 * — potentially hours before the session, quite possibly in an open-plan
 * office — is not a defensible default. `connect` only flips once they press
 * Go on air, and every device starts off.
 */
export function HostBroadcast({
  serverUrl,
  token,
  onLeave,
}: {
  serverUrl: string
  token: string
  onLeave: () => void
}) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      // Both off at connect time; the controls below turn them on. Passing
      // `video`/`audio` true here would prompt for the camera during connect,
      // before the host has chosen anything.
      video={false}
      audio={false}
      onDisconnected={onLeave}
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      <HostBroadcastInner />
    </LiveKitRoom>
  )
}

function HostBroadcastInner() {
  const connectionState = useConnectionState()
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant()
  const [busy, setBusy] = useState<string | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  // Show the host exactly what the room is looking at: the screen share as the
  // main view when there is one, with the camera as a bubble over it, so they
  // can see whether their face is covering the thing they're presenting.
  const tracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera], {
    onlySubscribed: false,
  })
  const own = tracks.filter((t) => t.participant.isLocal)
  const screen = own.find((t) => t.source === Track.Source.ScreenShare)
  const camera = own.find((t) => t.source === Track.Source.Camera)
  const main = screen ?? camera
  const bubble = screen ? camera : undefined

  async function toggle(what: 'camera' | 'mic' | 'screen') {
    setBusy(what)
    setDeviceError(null)
    try {
      if (what === 'camera') {
        await localParticipant.setCameraEnabled(!isCameraEnabled)
      } else if (what === 'mic') {
        await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
      } else {
        await localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
      }
    } catch (err) {
      // Refusing the browser prompt lands here, and so does "no camera on this
      // machine". Both are the host's to resolve, so say which happened rather
      // than leaving a button that silently doesn't work.
      const msg = err instanceof Error ? err.message : String(err)
      setDeviceError(
        /permission|denied|notallowed/i.test(msg)
          ? `Your browser blocked access to the ${what === 'mic' ? 'microphone' : what}. Allow it in the address bar and try again.`
          : /notfound|no device/i.test(msg)
            ? `No ${what === 'mic' ? 'microphone' : 'camera'} found on this device.`
            : msg,
      )
    } finally {
      setBusy(null)
    }
  }

  const connecting =
    connectionState === ConnectionState.Connecting ||
    connectionState === ConnectionState.Reconnecting

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden rounded-xl bg-slate-900">
        {main ? (
          <>
            <VideoTrack
              trackRef={main}
              className="h-full w-full object-contain"
            />
            {bubble && (
              <CameraBubble
                trackRef={bubble}
                storageKey="unisim-webinar-camera-bubble-host"
                label="Your camera"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center text-sm text-slate-300">
            <div>
              {connecting ? (
                <>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
                  <p className="mt-2">Connecting…</p>
                </>
              ) : (
                <>
                  <Camera className="mx-auto h-8 w-8 text-slate-500" />
                  <p className="mt-2">
                    You're on air. Turn your camera on, or share your screen.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Nobody sees or hears anything until you do.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
        {connectionState === ConnectionState.Connected && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-medium text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            On air
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isCameraEnabled ? 'default' : 'outline'}
          size="sm"
          disabled={busy !== null || connecting}
          onClick={() => void toggle('camera')}
        >
          {busy === 'camera' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCameraEnabled ? (
            <Camera className="h-4 w-4" />
          ) : (
            <CameraOff className="h-4 w-4" />
          )}
          {isCameraEnabled ? 'Camera on' : 'Camera off'}
        </Button>

        <Button
          type="button"
          variant={isMicrophoneEnabled ? 'default' : 'outline'}
          size="sm"
          disabled={busy !== null || connecting}
          onClick={() => void toggle('mic')}
        >
          {busy === 'mic' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isMicrophoneEnabled ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
          {isMicrophoneEnabled ? 'Mic on' : 'Mic off'}
        </Button>

        <Button
          type="button"
          variant={isScreenShareEnabled ? 'default' : 'outline'}
          size="sm"
          disabled={busy !== null || connecting}
          onClick={() => void toggle('screen')}
        >
          {busy === 'screen' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MonitorUp className="h-4 w-4" />
          )}
          {isScreenShareEnabled ? 'Stop sharing' : 'Share screen'}
        </Button>

        <span
          className={cn(
            'ml-auto text-xs',
            connectionState === ConnectionState.Connected
              ? 'text-slate-400'
              : 'text-amber-700',
          )}
        >
          {connectionState === ConnectionState.Connected
            ? 'Connected'
            : connectionState === ConnectionState.Reconnecting
              ? 'Reconnecting…'
              : connectionState}
        </span>
      </div>

      {deviceError && (
        <p className="mt-2 text-xs text-red-600">{deviceError}</p>
      )}
    </div>
  )
}
