-- Phase 2 (finish) — the host registration list.
--
-- Context: migration 0003 pivoted the app to multi-host SaaS, where an
-- unverified host proves ownership with a secret `manage_token` (a UUID) and
-- edits their webinar through the `update_webinar_by_token` RPC. That covered
-- WRITES, but there was never a token-gated way to READ the registrations, so
-- the "Registrations" panel on /host/w/:slug (an unauthenticated, token-only
-- session) silently returned zero rows — the old `registrations admin read`
-- policy is `to authenticated`, and a token-only host has no auth session.
--
-- This migration:
--   1. Adds `list_registrations_by_token(slug, token)` — the read counterpart
--      of `update_webinar_by_token`, so unverified hosts can see their own
--      registrations.
--   2. Tightens the authenticated-side registration policies so an OTP-verified
--      host only sees / manages registrations for THEIR OWN webinars (matched
--      by host_email), while the platform admin keeps full access. The old
--      `using (true)` let any authenticated host read every other host's
--      registrant emails — a cross-tenant leak in the multi-host model.
--
-- Idempotent and safe to re-run.

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: list registrations via the secret manage_token (for unverified hosts).
-- security definer so it bypasses RLS — the token IS the authorisation, exactly
-- like update_webinar_by_token in 0003.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.list_registrations_by_token(
  p_slug text,
  p_token uuid
) returns setof registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar_id uuid;
begin
  select id into v_webinar_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_webinar_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return query
    select *
    from registrations
    where webinar_id = v_webinar_id
    order by registered_at desc;
end;
$$;

revoke all on function public.list_registrations_by_token(text, uuid) from public;
grant execute on function public.list_registrations_by_token(text, uuid)
  to anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- Tighten the authenticated registration policies to the multi-host model:
-- platform admin sees everything; an OTP-verified host sees only registrations
-- for webinars registered to their own email.
-- ──────────────────────────────────────────────────────────────────────────────

-- Read
drop policy if exists "registrations admin read" on registrations;
drop policy if exists "registrations host read" on registrations;
create policy "registrations host read" on registrations
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from webinars w
      where w.id = registrations.webinar_id
        and lower(w.host_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Update
drop policy if exists "registrations admin update" on registrations;
drop policy if exists "registrations host update" on registrations;
create policy "registrations host update" on registrations
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from webinars w
      where w.id = registrations.webinar_id
        and lower(w.host_email) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from webinars w
      where w.id = registrations.webinar_id
        and lower(w.host_email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Delete
drop policy if exists "registrations admin delete" on registrations;
drop policy if exists "registrations host delete" on registrations;
create policy "registrations host delete" on registrations
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from webinars w
      where w.id = registrations.webinar_id
        and lower(w.host_email) = lower(auth.jwt() ->> 'email')
    )
  );
