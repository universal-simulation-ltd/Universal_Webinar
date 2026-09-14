import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  Mail,
  Palette,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  {
    to: '/host/webinars',
    label: 'My webinars',
    icon: Video,
    description: 'Active rooms, past sessions, and recordings.',
  },
  {
    to: '/host/upgrade',
    label: 'Upgrade to Pro',
    icon: Sparkles,
    badge: 'Pro' as const,
    description: 'Unlock branding, statistics, and automated emails.',
  },
  {
    to: '/host/branding',
    label: 'My branding',
    icon: Palette,
    description: 'Logo, accent color, and white-label.',
  },
  {
    to: '/host/statistics',
    label: 'My statistics',
    icon: TrendingUp,
    description: 'Attendance, engagement, and chat insights.',
  },
  {
    to: '/host/emails',
    label: 'Automatic emails',
    icon: Mail,
    description: 'Reminders, recordings, follow-ups.',
  },
]

// The dropdown panel is rendered into document.body via React Portal so that
// the header's `overflow-hidden` (which we need to crop the embossed brand
// watermark) can't also clip the menu. Position is computed from the
// trigger button's bounding rect and refreshed on scroll / resize while open.
export function CompanyMenu() {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  )
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  function updateCoords() {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    })
  }

  function toggle() {
    if (!open) updateCoords()
    setOpen((v) => !v)
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = () => updateCoords()
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler)
      window.removeEventListener('resize', handler)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
          open
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
        )}
      >
        <Building2 className="h-4 w-4" />
        <span>My company</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[60] w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg"
              style={{ top: coords.top, right: coords.right }}
            >
              {ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="rounded-full bg-brand-100 dark:bg-brand-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                            {item.badge}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
