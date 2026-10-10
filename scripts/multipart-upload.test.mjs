// Run: npm run test:unit
//
// The replay multipart client (src/lib/multipartUpload.ts) against a fake
// hosted-files function + Worker: parts are sliced right, a dropped
// connection pauses with every finished part kept, Resume sends only what is
// missing, stale URLs are re-signed, and a refusal is final.

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  planParts,
  newMultipartState,
  storedBytes,
  uploadParts,
  MultipartError,
} from '../src/lib/multipartUpload.ts'

const PART = 10 // tiny parts so the test file stays tiny

function fakeServer({ failParts = new Set(), failTimes = Infinity, expireOnce = false, refuse = null } = {}) {
  const calls = { invoke: [], put: [], complete: [] }
  const stored = new Map()
  const failures = new Map()
  let expired = expireOnce
  let gen = 0
  const invoke = async (body) => {
    calls.invoke.push(body.action)
    gen++
    return {
      data: {
        upload_id: 'up-1',
        part_url: `https://w/o/k?m=MPU_PART&g=${gen}`,
        complete_url: `https://w/o/k?m=MPU_COMPLETE&g=${gen}`,
        abort_url: 'https://w/o/k?m=MPU_ABORT',
        part_bytes: PART,
      },
      error: null,
    }
  }
  const fetchImpl = async (url, init) => {
    const u = new URL(url)
    const json = (status, body) => new Response(JSON.stringify(body), { status })
    if (u.searchParams.get('m') === 'MPU_PART') {
      const part = Number(u.searchParams.get('part'))
      calls.put.push(part)
      if (expired) {
        expired = false
        return json(403, { ok: false, error: 'expired' })
      }
      if (refuse) return json(refuse.status, { ok: false, error: refuse.error })
      if (failParts.has(part) && (failures.get(part) ?? 0) < failTimes) {
        failures.set(part, (failures.get(part) ?? 0) + 1)
        throw new TypeError('Failed to fetch')
      }
      const bytes = new Uint8Array(await init.body.arrayBuffer())
      stored.set(part, bytes)
      return json(200, { ok: true, part, etag: `e${part}` })
    }
    if (u.searchParams.get('m') === 'MPU_COMPLETE') {
      const { parts } = JSON.parse(init.body)
      calls.complete.push(parts)
      const size = parts.reduce((n, p) => n + stored.get(p.part).length, 0)
      return json(201, { ok: true, size })
    }
    return json(404, {})
  }
  return { invoke, fetchImpl, calls, stored }
}

function file(size) {
  const b = new Uint8Array(size)
  for (let i = 0; i < size; i++) b[i] = i % 251
  return new Blob([b], { type: 'video/webm' })
}

const noDelay = () => 0

test('planParts: full-size parts, a short last one, nothing for an empty file', () => {
  assert.deepEqual(planParts(25, 10), [
    { part: 1, start: 0, end: 10 },
    { part: 2, start: 10, end: 20 },
    { part: 3, start: 20, end: 25 },
  ])
  assert.deepEqual(planParts(20, 10).map((p) => p.part), [1, 2])
  assert.deepEqual(planParts(0, 10), [])
  // 2 GiB in 16 MiB parts — the server's own cap.
  assert.equal(planParts(2 * 1024 ** 3, 16 * 1024 ** 2).length, 128)
})

test('a clean upload sends every part once, completes in order, and reports progress', async () => {
  const srv = fakeServer()
  const f = file(35)
  const state = newMultipartState('org/recorder/x-webinar-replay-y.webm', 'video/webm', f.size)
  const seen = []
  const res = await uploadParts({ invoke: srv.invoke, fetchImpl: srv.fetchImpl, file: f, state, delayMs: noDelay, onProgress: (s) => seen.push(s) })
  assert.equal(res.size, 35)
  assert.deepEqual(srv.calls.invoke, ['multipart-create'])
  assert.deepEqual([...srv.calls.put].sort(), [1, 2, 3, 4])
  assert.deepEqual(srv.calls.complete[0].map((p) => p.part), [1, 2, 3, 4])
  assert.equal(seen.at(-1), 35)
  assert.ok(seen.every((v, i) => i === 0 || v >= seen[i - 1]), 'progress never goes backwards')
  // Bytes landed where they belong.
  assert.equal(srv.stored.get(4).length, 5)
  assert.equal(srv.stored.get(2)[0], 10)
})

test('a part that keeps failing pauses the upload; Resume sends only what is missing', async () => {
  const srv = fakeServer({ failParts: new Set([3]), failTimes: 4 })
  const f = file(40)
  const state = newMultipartState('k', 'video/webm', f.size)
  await assert.rejects(
    uploadParts({ invoke: srv.invoke, fetchImpl: srv.fetchImpl, file: f, state, delayMs: noDelay }),
    (err) => err instanceof MultipartError && err.code === 'network',
  )
  assert.equal(state.done.has(3), false)
  assert.ok(state.done.size >= 1, 'finished parts are kept')
  assert.equal(srv.calls.complete.length, 0)
  const before = new Set(state.done.keys())

  srv.calls.put.length = 0
  const res = await uploadParts({ invoke: srv.invoke, fetchImpl: srv.fetchImpl, file: f, state, delayMs: noDelay })
  assert.equal(res.size, 40)
  for (const p of srv.calls.put) assert.equal(before.has(p), false, `part ${p} was sent again`)
  assert.deepEqual(srv.calls.invoke, ['multipart-create'], 'resume reuses the same upload')
  assert.equal(storedBytes(state), 40)
})

test('a blip shorter than the retry budget is absorbed without pausing', async () => {
  const srv = fakeServer({ failParts: new Set([2]), failTimes: 2 })
  const f = file(30)
  const state = newMultipartState('k', 'video/webm', f.size)
  const res = await uploadParts({ invoke: srv.invoke, fetchImpl: srv.fetchImpl, file: f, state, delayMs: noDelay })
  assert.equal(res.size, 30)
})

test('stale URLs are re-signed with multipart-sign and the part retried', async () => {
  const srv = fakeServer({ expireOnce: true })
  const f = file(15)
  const state = newMultipartState('k', 'video/webm', f.size)
  const res = await uploadParts({ invoke: srv.invoke, fetchImpl: srv.fetchImpl, file: f, state, delayMs: noDelay })
  assert.equal(res.size, 15)
  assert.deepEqual(srv.calls.invoke, ['multipart-create', 'multipart-sign'])
})

test('a refusal from the Worker is final, not retried', async () => {
  const srv = fakeServer({ refuse: { status: 413, error: 'too_large' } })
  const f = file(15)
  const state = newMultipartState('k', 'video/webm', f.size)
  await assert.rejects(
    uploadParts({ invoke: srv.invoke, fetchImpl: srv.fetchImpl, file: f, state, delayMs: noDelay }),
    (err) => err instanceof MultipartError && err.code === 'too_large',
  )
  assert.ok(srv.calls.put.length <= 2, 'no retry storm')
})

test('a create refusal surfaces the server error', async () => {
  const state = newMultipartState('k', 'video/webm', 100)
  await assert.rejects(
    uploadParts({ invoke: async () => ({ data: null, error: 'too_large' }), file: file(100), state, delayMs: noDelay }),
    (err) => err instanceof MultipartError && err.code === 'too_large',
  )
})
