// Run: npm run test:unit
//
// What create_webinar (universal-platform 0263) returns, mapped to the row the
// app works with — and every refusal turned into a CreateWebinarError the form
// can branch on.

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CreateWebinarError,
  webinarFromCreateResult,
  isMissingFunction,
} from '../src/lib/createWebinarResult.ts'

test('a created webinar keeps the server token and the host address, and has no PIN or recording', () => {
  const w = webinarFromCreateResult({
    ok: true,
    manage_token: '7a1e1c0e-0000-4000-8000-000000000001',
    webinar: { id: 'w1', slug: 'launch-ab12', title: 'Launch', host_email: 'host@example.com', recording_url: 'x', status: 'scheduled' },
    hold: { held: true, funded_by: 'free_app' },
    no_company: false,
  })
  assert.equal(w.slug, 'launch-ab12')
  assert.equal(w.manage_token, '7a1e1c0e-0000-4000-8000-000000000001')
  assert.equal(w.host_email, 'host@example.com')
  assert.equal(w.recording_url, null)
  assert.equal(w.entry_pin, null)
})

test('refusals become CreateWebinarError with the RPC code', () => {
  for (const code of ['no_credits', 'token_in_use: Webinar: Launch', 'no_company_webinar_used', 'slug_taken', 'not_authenticated']) {
    assert.throws(
      () => webinarFromCreateResult({ ok: false, error: code, used: 1, limit: 1 }),
      (err) => err instanceof CreateWebinarError && err.code === code,
    )
  }
  const err = (() => {
    try {
      webinarFromCreateResult({ ok: false, error: 'no_company_webinar_used', used: 1, limit: 1 })
    } catch (e) {
      return e
    }
  })()
  assert.deepEqual(err.detail, { ok: false, used: 1, limit: 1 })
})

test('a malformed success is a failure, never a webinar without a token', () => {
  assert.throws(() => webinarFromCreateResult({ ok: true, webinar: { id: 'w' } }), CreateWebinarError)
  assert.throws(() => webinarFromCreateResult(null), (e) => e instanceof CreateWebinarError && e.code === 'failed')
})

test('only "no such function" falls back to the self-hosted direct insert', () => {
  assert.equal(isMissingFunction({ code: 'PGRST202', message: 'Could not find the function public.create_webinar(p_webinar)' }), true)
  assert.equal(isMissingFunction({ code: '42501', message: 'permission denied for table webinars' }), false)
  assert.equal(isMissingFunction(null), false)
})
