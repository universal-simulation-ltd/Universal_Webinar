import type { ReactNode } from 'react'
import { ChevronDown, GripVertical } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface PanelCardProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Buttons that belong to the card itself (a refresh, say), not to collapsing. */
  actions?: ReactNode
  collapsed: boolean
  onToggle: () => void
  /** Spread from the parent's drag helper; omit to make a card fixed in place. */
  dragProps?: Record<string, unknown>
  /** Arms the drag. Pressing anywhere else must not start one — see below. */
  onGripDown?: () => void
  onGripUp?: () => void
  /** Rendered only when expanded, so a collapsed card costs nothing. */
  children: ReactNode
}

/**
 * A card in a column the host can collapse and reorder.
 *
 * The grip is a real, separate control rather than making the whole card
 * draggable: a card full of inputs and toggles that starts a drag whenever you
 * mousedown on it is miserable to use, and the header doubles as the collapse
 * button. Dragging is armed by pressing the grip (see the parent's
 * `canDragRefs`) — the same approach Ergo Assess uses for its panels.
 */
export function PanelCard({
  icon,
  title,
  description,
  actions,
  collapsed,
  onToggle,
  dragProps,
  onGripDown,
  onGripUp,
  children,
}: PanelCardProps) {
  return (
    <Card {...dragProps}>
      <CardHeader className={cn(collapsed && 'py-4')}>
        <div className="flex items-center gap-1.5">
          {dragProps && (
            <span
              // Not a <button>: it exists to be pressed and dragged, never
              // clicked, and a button here would land in the tab order offering
              // keyboard users an action they can't perform.
              aria-hidden
              onMouseDown={onGripDown}
              onMouseUp={onGripUp}
              onMouseLeave={onGripUp}
              className="-ml-1.5 shrink-0 cursor-grab text-slate-300 transition-colors hover:text-slate-500 active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <CardTitle className="flex min-w-0 items-center gap-2">
              {icon}
              <span className="truncate">{title}</span>
            </CardTitle>
            <ChevronDown
              className={cn(
                'ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform',
                collapsed && '-rotate-90',
              )}
            />
          </button>
          {actions}
        </div>
        {!collapsed && description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      {!collapsed && <CardContent>{children}</CardContent>}
    </Card>
  )
}
