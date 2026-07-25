-- Universal Webinar — registration confirmation emails + per-registrant join
-- tokens (registration phase 4).
--
-- When someone registers for a webinar we now email them a confirmation with a
-- calendar invite and their OWN join link, rather than leaving them to remember
-- the page they registered on.
--
--   • registrations.join_token         — an unguessable per-registrant UUID. The
--       confirmation email's link carries it (…/w/<slug>/register?t=<token>) so
--       the registrant lands straight in the "you're in" state on any device,
--       without re-typing their details. Phases 6-8 (approval gating, unique
--       join links) build the access decision on this same token.
--   • registrations.confirmation_sent_at — stamped by the send-webinar-confirmation
--       Edge Function once Resend accepts the message. Doubles as the idempotency
--       guard: the function skips a registration that already has one, so a
--       re-submitted form can never mail the same person twice.
--   • webinars.send_confirmation       — host opt-out, default ON.
--
-- The registration row is inserted directly by the (anon) register form and anon
-- has no SELECT on registrations, so the join token is never handed to the
-- browser at registration time — the Edge Function reads it server-side with the
-- service role and puts it in the email. `get_registration_by_join_token` is the
-- only read path back, and holding the token IS the authorisation (same shape as
-- update_webinar_by_token / list_registrations_by_token in 0003 / 0062).
--
-- Idempotent and safe to re-run. The webinar tables live in the shared platform
-- project; these ALTERs are additive against the already-live tables
-- (universal-platform owns the tracked webinar-schema lineage — cf. 0062/0064).
--
-- ⚠️ MIRROR ONLY — this file is a copy of
--    universal-platform/supabase/migrations/0065_webinar_registration_confirmation.sql,
--    kept here so a local `supabase db reset` reproduces the schema. The numbers
--    in THIS directory collide with universal-platform's own 0001-0007, so a
--    `db push` from this repo would no-op or collide against the shared project.
--    Apply webinar schema changes from universal-platform, never from here.

-- ── Columns ───────────────────────────────────────────────────────────────────
-- gen_random_uuid() is volatile, so back-filling this on an existing table
-- rewrites it and gives every existing registration its own distinct token.
alter table public.registrations
  add column if not exists join_token uuid not null default gen_random_uuid();

alter table public.registrations
  add column if not exists confirmation_sent_at timestamptz;

create unique index if not exists registrations_join_token_key
  on public.registrations (join_token);

alter table public.webinars
  add column if not exists send_confirmation boolean not null default true;

-- ── Resolve a registration from its join token ────────────────────────────────
-- security definer so the (anon) registrant can exchange their emailed token for
-- their own registration — anon has INSERT but no SELECT on registrations. Only
-- the fields the "you're in" page needs are returned: no other registrant's data
-- and nothing about the host's setup beyond the webinar slug.
create or replace function public.get_registration_by_join_token(
  p_token uuid
) returns table (
  registration_id uuid,
  webinar_id uuid,
  slug text,
  name text,
  email text,
  registered_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.webinar_id, w.slug, r.name, r.email, r.registered_at
  from registrations r
  join webinars w on w.id = r.webinar_id
  where r.join_token = p_token;
$$;

revoke all on function public.get_registration_by_join_token(uuid) from public;
grant execute on function public.get_registration_by_join_token(uuid)
  to anon, authenticated;

-- ── Extend update_webinar_by_token to accept send_confirmation ────────────────
-- Same body as 0064's definition (create-or-replace against the live function),
-- with 'send_confirmation' added to the allow-list and the UPDATE. Keys that
-- aren't allow-listed are silently stripped, so a host toggling this from the
-- Manage page would be a no-op without this step.
create or replace function public.update_webinar_by_token(
  p_slug text,
  p_token uuid,
  p_patch jsonb
) returns webinars
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row webinars;
  v_allowed text[] := array[
    'title', 'description', 'scheduled_at', 'started_at', 'ended_at',
    'status', 'allow_speak_requests', 'show_guest_count', 'recording_url',
    'host_name', 'company_name', 'logo_url', 'custom_questions',
    'send_confirmation'
  ];
  v_filtered jsonb;
  v_key text;
begin
  -- Strip any keys the host shouldn't be able to overwrite (manage_token,
  -- host_email, host_verified, etc.).
  v_filtered := '{}'::jsonb;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key = any(v_allowed) then
      v_filtered := v_filtered || jsonb_build_object(v_key, p_patch->v_key);
    end if;
  end loop;

  update webinars
  set
    title                = coalesce(v_filtered->>'title', title),
    description          = coalesce(v_filtered->>'description', description),
    scheduled_at         = case
                             when v_filtered ? 'scheduled_at'
                             then (v_filtered->>'scheduled_at')::timestamptz
                             else scheduled_at
                           end,
    started_at           = case
                             when v_filtered ? 'started_at'
                             then (v_filtered->>'started_at')::timestamptz
                             else started_at
                           end,
    ended_at             = case
                             when v_filtered ? 'ended_at'
                             then (v_filtered->>'ended_at')::timestamptz
                             else ended_at
                           end,
    status               = coalesce((v_filtered->>'status')::webinar_status, status),
    allow_speak_requests = coalesce((v_filtered->>'allow_speak_requests')::boolean, allow_speak_requests),
    show_guest_count     = coalesce((v_filtered->>'show_guest_count')::boolean, show_guest_count),
    recording_url        = coalesce(v_filtered->>'recording_url', recording_url),
    host_name            = coalesce(v_filtered->>'host_name', host_name),
    company_name         = coalesce(v_filtered->>'company_name', company_name),
    logo_url             = coalesce(v_filtered->>'logo_url', logo_url),
    custom_questions     = case
                             when v_filtered ? 'custom_questions'
                             then v_filtered->'custom_questions'
                             else custom_questions
                           end,
    send_confirmation    = coalesce((v_filtered->>'send_confirmation')::boolean, send_confirmation)
  where slug = p_slug and manage_token = p_token
  returning * into v_row;

  if v_row is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;
