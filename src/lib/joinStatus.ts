// When is this webinar, and can I go in now? — what the guest join page says
// above its form. Pure functions, so `scripts/join-status.test.mjs` can run
// them under plain Node; the words live in joinCopy.ts.

import type { WebinarStatus } from './database.types'

export type JoinState = 'live' | 'soon' | 'upcoming' | 'waiting' | 'ended'

/** How long before the scheduled start "Starting soon" takes over. */
export const SOON_MS = 15 * 60 * 1000

interface StatusFields {
  status: WebinarStatus
  scheduled_at: string | null
}

/**
 * - `live` / `ended` come from the room's own status.
 * - A scheduled room is `soon` from 15 minutes before its start — and stays
 *   `soon` once the start has passed but the host hasn't gone live yet.
 * - `upcoming` before that.
 * - `waiting` when no date was ever set (the host will go live when ready).
 */
export function joinState(w: StatusFields, now: number): JoinState {
  if (w.status === 'live') return 'live'
  if (w.status === 'ended') return 'ended'
  const at = w.scheduled_at ? Date.parse(w.scheduled_at) : NaN
  if (Number.isNaN(at)) return 'waiting'
  return now >= at - SOON_MS ? 'soon' : 'upcoming'
}

/**
 * "Fri 20 Nov, 17:30 GMT" — in the viewer's own time zone and the language
 * they read the app in, and always zone-labelled (an unlabelled time is
 * untrustworthy when devices disagree about where they are). The year appears
 * only when it isn't this year. `timeZone` is for tests; the page leaves it
 * to the browser.
 */
export function formatJoinWhen(
  iso: string,
  locale: string | undefined,
  now: number,
  timeZone?: string,
): string | null {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  }
  const yearOf = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone }).format(d)
  if (yearOf(at) !== yearOf(new Date(now))) opts.year = 'numeric'
  try {
    return new Intl.DateTimeFormat(locale, opts).format(at)
  } catch {
    // An unknown locale tag: the browser's own.
    return new Intl.DateTimeFormat(undefined, opts).format(at)
  }
}
