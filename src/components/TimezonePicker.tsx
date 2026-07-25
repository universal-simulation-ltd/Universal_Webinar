import { useEffect, useMemo, useRef, useState } from 'react'
import { filterTimezones, listTimezones, tzAbbrev } from '@/lib/time'

/** Ported from Universal Date Polling (2026-07-24), which built and tested this
 *  same control. Kept byte-similar so a future extraction into @unisim/sdk is a
 *  straight lift rather than a merge of two drifted copies.
 *
 *  A compact searchable timezone dropdown. Shows the currently selected zone
 *  (with its short abbreviation) as a button; opening it reveals a search box
 *  and a scrollable, filtered list of every IANA zone the platform knows.
 *
 *  Deliberately inline (no portal): it lives in normal page flow near the top of
 *  the poll, with no `overflow-hidden` ancestor to clip it. Closes on
 *  outside-click or Escape. */
export default function TimezonePicker({
  value,
  onChange,
  at = new Date(),
  label = 'Show times in',
}: {
  value: string
  onChange: (tz: string) => void
  /** Instant used to label each zone's abbreviation (BST vs GMT etc.). */
  at?: Date
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const zones = useMemo(() => listTimezones(), [])
  const matches = useMemo(() => filterTimezones(query, zones).slice(0, 200), [query, zones])

  useEffect(() => {
    if (!open) return
    // Focus the search box as soon as the panel opens.
    inputRef.current?.focus()
    const onDocPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(tz: string) {
    onChange(tz)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 h-9 text-sm text-slate-700 hover:border-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] outline-none"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-slate-400" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">{label}: </span>
        <span className="max-w-[13rem] truncate">{value}</span>
        <span className="text-slate-400">({tzAbbrev(value, at)})</span>
        <svg viewBox="0 0 12 12" className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-1.5 w-72 max-w-[85vw] rounded-lg bg-white shadow-lg ring-1 ring-slate-200 pop-in">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search time zones…"
              className="w-full h-9 rounded-md border border-slate-300 px-2.5 text-sm text-slate-900 focus:border-[var(--accent)] outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matching time zones.</li>
            ) : (
              matches.map((z) => {
                const selected = z === value
                return (
                  <li key={z}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => pick(z)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${selected ? 'font-semibold text-[var(--accent-text)]' : 'text-slate-700'}`}
                    >
                      <span className="min-w-0 truncate">{z}</span>
                      <span className="shrink-0 text-xs text-slate-400">{tzAbbrev(z, at)}</span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
