import { useCallback, useEffect, useRef, useState } from 'react'
import { VideoTrack } from '@livekit/components-react'
import type { TrackReference } from '@livekit/components-react'

/**
 * The presenter's face, on top of what they're sharing, draggable out of the way.
 *
 * Position is a percentage of the stage rather than pixels, so it survives the
 * container resizing (fullscreen, a phone rotating, the sidebar collapsing)
 * instead of drifting off the edge or landing over the content.
 *
 * It is a purely local preference — nothing is broadcast. Two people watching
 * the same webinar can park it in opposite corners, and where the host puts
 * theirs has no effect on anyone else.
 *
 * Pointer events, not the HTML5 drag API: this has to work under a finger as
 * well as a mouse, and dragging a `<video>` with the native API produces a
 * ghost image of the frame. Arrow keys move it too, so it isn't mouse-only.
 */

/** Percent of the stage the bubble moves per arrow-key press. */
const NUDGE = 4

interface Position {
  x: number
  y: number
}

const DEFAULT_POSITION: Position = { x: 3, y: 68 }

function load(storageKey: string): Position | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Position
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null
    // A stored value outside the stage would hide the bubble completely, so
    // treat anything out of range as absent rather than clamping it back in.
    if (parsed.x < 0 || parsed.x > 100 || parsed.y < 0 || parsed.y > 100) return null
    return parsed
  } catch {
    return null
  }
}

export function CameraBubble({
  trackRef,
  storageKey,
  label = 'Presenter camera',
}: {
  trackRef: TrackReference
  /** Distinct per surface, so the host's placement and a guest's don't fight. */
  storageKey: string
  label?: string
}) {
  const [pos, setPos] = useState<Position>(() => load(storageKey) ?? DEFAULT_POSITION)
  const [dragging, setDragging] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  // Where inside the bubble the pointer grabbed it, so it doesn't jump so the
  // cursor sits at its top-left the moment you press.
  const grab = useRef({ dx: 0, dy: 0 })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos))
    } catch {
      // A remembered position is not worth an exception in private mode.
    }
  }, [pos, storageKey])

  /** Clamp so the whole bubble stays on the stage, not just its origin. */
  const clamp = useCallback((x: number, y: number): Position => {
    const el = boxRef.current
    const stage = el?.offsetParent as HTMLElement | null
    if (!el || !stage) return { x, y }
    const maxX = 100 - (el.offsetWidth / stage.clientWidth) * 100
    const maxY = 100 - (el.offsetHeight / stage.clientHeight) * 100
    return {
      x: Math.min(Math.max(x, 0), Math.max(maxX, 0)),
      y: Math.min(Math.max(y, 0), Math.max(maxY, 0)),
    }
  }, [])

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = boxRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    // Capture so the drag survives the pointer leaving the bubble — without
    // this a quick movement drops it the moment you outrun the video.
    el.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const stage = boxRef.current?.offsetParent as HTMLElement | null
    if (!stage) return
    const bounds = stage.getBoundingClientRect()
    const x = ((e.clientX - grab.current.dx - bounds.left) / bounds.width) * 100
    const y = ((e.clientY - grab.current.dy - bounds.top) / bounds.height) * 100
    setPos(clamp(x, y))
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    boxRef.current?.releasePointerCapture(e.pointerId)
    setDragging(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, Position> = {
      ArrowLeft: { x: -NUDGE, y: 0 },
      ArrowRight: { x: NUDGE, y: 0 },
      ArrowUp: { x: 0, y: -NUDGE },
      ArrowDown: { x: 0, y: NUDGE },
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    setPos((p) => clamp(p.x + move.x, p.y + move.y))
  }

  return (
    <div
      ref={boxRef}
      role="group"
      aria-label={`${label} — drag, or use the arrow keys, to move it`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      className={[
        'absolute z-10 h-24 w-24 touch-none overflow-hidden rounded-full sm:h-32 sm:w-32',
        // The frame does real work: against a light slide a pale face has no
        // edge, and the shadow lifts it off the content behind it.
        'shadow-lg ring-2 ring-white/80',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      ].join(' ')}
    >
      <VideoTrack
        trackRef={trackRef}
        // Cover, not contain: a circle cropping a 16:9 frame is the point, and
        // `contain` would letterbox a rectangle inside the circle.
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        // The bubble handles the pointer; the video must not swallow it.
        className="pointer-events-none select-none"
      />
    </div>
  )
}
