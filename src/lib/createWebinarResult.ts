import type { WebinarRow, WebinarWithManageToken } from './database.types'

// What the platform's create_webinar() RPC (universal-platform 0262) hands
// back, turned into the row the app works with. No runtime imports, so
// `createWebinarResult.test.mjs` runs it under Node's type stripping.

/** A create_webinar refusal: `code` is the RPC's error, e.g. 'no_credits',
 *  'token_in_use: Webinar: …', 'no_company_webinar_used', 'slug_taken'. */
export class CreateWebinarError extends Error {
  readonly code: string
  readonly detail: Record<string, unknown>
  constructor(code: string, detail: Record<string, unknown> = {}) {
    super(code)
    this.name = 'CreateWebinarError'
    this.code = code
    this.detail = detail
  }
}

export interface CreateWebinarRpcResult {
  ok?: boolean
  error?: string
  webinar?: Record<string, unknown>
  manage_token?: string
  [k: string]: unknown
}

export function webinarFromCreateResult(res: CreateWebinarRpcResult | null): WebinarWithManageToken {
  if (!res?.ok || !res.webinar || typeof res.manage_token !== 'string' || !res.manage_token) {
    const { error, ...detail } = res ?? {}
    throw new CreateWebinarError(typeof error === 'string' && error ? error : 'failed', detail)
  }
  const row = res.webinar
  return {
    ...(row as unknown as WebinarRow),
    // The creator may read back what they just wrote (the server sets it to
    // their own verified address). A new webinar has no recording or PIN, and
    // the shared document is read through its own RPC (0253).
    host_email: typeof row.host_email === 'string' ? row.host_email : null,
    recording_url: null,
    shared_doc_url: null,
    shared_doc_name: null,
    manage_token: res.manage_token,
    entry_pin: null,
  }
}

/** PostgREST's "no such function" — a self-hosted database without 0262. */
export function isMissingFunction(err: { code?: string; message?: string } | null | undefined): boolean {
  return !!err && (err.code === 'PGRST202' || /could not find the function/i.test(err.message ?? ''))
}
