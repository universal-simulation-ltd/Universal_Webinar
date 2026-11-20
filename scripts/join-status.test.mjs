// Run: npm run test:unit
//
// The guest join page's "is it on?" chip and its date line (src/lib/joinStatus.ts).

import test from 'node:test'
import assert from 'node:assert/strict'
import { formatJoinWhen, joinState, SOON_MS } from '../src/lib/joinStatus.ts'

const at = Date.parse('2026-11-20T17:30:00Z')

test('live and ended come from the room status, whatever the date', () => {
  assert.equal(joinState({ status: 'live', scheduled_at: null }, at), 'live')
  assert.equal(joinState({ status: 'ended', scheduled_at: '2026-11-21T10:00:00Z' }, at), 'ended')
})

test('a scheduled room is upcoming, then starting soon from 15 minutes out — and stays so if the host is late', () => {
  const w = { status: 'scheduled', scheduled_at: new Date(at).toISOString() }
  assert.equal(joinState(w, at - SOON_MS - 1), 'upcoming')
  assert.equal(joinState(w, at - SOON_MS), 'soon')
  assert.equal(joinState(w, at + 60 * 60 * 1000), 'soon')
})

test('no date (or a broken one) means waiting for the host to start', () => {
  assert.equal(joinState({ status: 'scheduled', scheduled_at: null }, at), 'waiting')
  assert.equal(joinState({ status: 'scheduled', scheduled_at: 'nope' }, at), 'waiting')
})

test('the date is in the viewer zone and language, always zone-labelled', () => {
  const iso = '2026-11-20T17:30:00Z'
  assert.equal(formatJoinWhen(iso, 'en-gb', at, 'Europe/London'), 'Fri 20 Nov, 17:30 GMT')
  const ny = formatJoinWhen(iso, 'en', at, 'America/New_York')
  assert.match(ny, /Fri, Nov 20, 12:30\s?PM EST/)
  const fr = formatJoinWhen(iso, 'fr', at, 'Europe/Paris')
  assert.match(fr, /^ven\.\s20\snov\..*18:30\s.*UTC\+1$/)
})

test('the year shows only when it is not this year', () => {
  const next = formatJoinWhen('2027-01-08T09:00:00Z', 'en-gb', at, 'Europe/London')
  assert.match(next, /2027/)
  assert.doesNotMatch(formatJoinWhen('2026-12-01T09:00:00Z', 'en-gb', at, 'Europe/London'), /2026/)
})

test('a bad timestamp gives no line rather than "Invalid Date"', () => {
  assert.equal(formatJoinWhen('nope', 'en-gb', at), null)
})
