// Timezone helpers, built on the platform Intl API — no date library needed.
//
// Ported from Universal Date Polling's src/lib/time.ts, which shipped the same
// problem's solution on 2026-07-24 (viewer-timezone display + a searchable
// picker). Only the zone helpers came across; Polling's slot/poll maths stayed
// behind. If a third app needs these, promote them to @unisim/sdk rather than
// copying a third time.

/** The viewer's IANA timezone, or 'UTC' if it can't be resolved. */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** A de-duplicated list of IANA zones for the picker — the full platform list
 *  where available (modern browsers), else a curated fallback. */
export function listTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    const all = fn?.('timeZone')
    if (all && all.length) return all
  } catch {
    /* fall through */
  }
  return FALLBACK_ZONES
}

/** Filter a list of IANA zones by a free-text query for the searchable picker.
 *  Both the query and each zone are normalised so '/' and '_' read as spaces —
 *  so "new york" matches "America/New_York" and "london" matches
 *  "Europe/London". An empty query returns the list unchanged. */
export function filterTimezones(query: string, zones: string[]): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_/]+/g, ' ').trim()
  const q = norm(query)
  if (!q) return zones
  return zones.filter((z) => norm(z).includes(q))
}

/** Short tz label, e.g. "GMT+1" appended to the IANA name where useful. */
export function tzAbbrev(tz: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(at)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz
  } catch {
    return tz
  }
}

const FALLBACK_ZONES = [
  'UTC',
  'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Europe/Rome', 'Europe/Amsterdam', 'Europe/Lisbon', 'Europe/Athens', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'America/Mexico_City',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland',
]


// ── Display ───────────────────────────────────────────────────────────────────

/** "Sat 25 Jul, 20:06 BST" — a full labelled time in the given zone. The zone
 *  abbreviation is never optional: an unlabelled local time is untrustworthy
 *  when a viewer's devices disagree about their locale, which is exactly the
 *  case this was built for. */
export function formatWithZone(instant: Date, tz: string): string {
  const when = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(instant)
  return `${when} ${tzAbbrev(tz, instant)}`
}

/** "19:06 UTC" — the anchor shown alongside a localised time so a viewer can
 *  reconcile it against the same instant quoted anywhere else (their calendar,
 *  our emails, the host's own listing). */
export function formatUtc(instant: Date): string {
  const when = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(instant)
  return `${when} UTC`
}

/** True when the zone is effectively UTC, so the "(equivalent to …)" anchor
 *  would just repeat itself and should be omitted. */
export function isUtc(tz: string, at: Date = new Date()): boolean {
  try {
    const off = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? ''
    return off === 'GMT' || off === 'UTC' || off === 'GMT+0'
  } catch {
    return tz === 'UTC'
  }
}

/** The one-line form used across the app: the viewer's time, always labelled,
 *  with the UTC anchor in brackets unless they already are UTC. */
export function formatLocalWithUtc(instant: Date, tz: string): string {
  const local = formatWithZone(instant, tz)
  return isUtc(tz, instant) ? local : `${local} (equivalent to ${formatUtc(instant)})`
}
