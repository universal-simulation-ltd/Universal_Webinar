-- Universal Webinar — approval / waitlist gating (registration phase 6).
--
-- NOTE ON NUMBERING: this is 0070, not 0069 — 0069 was taken by family_core
-- (Universal Family, PR #79) while this was being written. universal-platform is
-- a SHARED lineage across products; always re-check the highest number in this
-- directory immediately before pushing, not when you start writing.
--
-- Until now, registering was the whole story: anyone with the slug could walk in
-- the door at /w/<slug> and get an attendee row, which IS the access grant the
-- live room checks. This lets a host require approval — registrants land
-- `pending`, the host approves / waitlists / declines them, and only `approved`
-- ones can create an attendee.
--
--   • webinars.require_approval — host opt-in, default OFF so every existing
--       webinar keeps behaving exactly as before.
--   • registrations.status — 'pending' | 'approved' | 'waitlisted' | 'declined'.
--       Default 'approved' so a non-gated webinar needs no special-casing
--       anywhere; the trigger below overrides it to 'pending' when the host has
--       gating on.
--
-- ⚠️ Both gates are enforced by TRIGGERS, not by the client, because the
-- registration form and the door form are anon `insert`s straight onto the
-- tables. A client that set `status: 'approved'` in its payload, or POSTed an
-- attendee row directly to PostgREST with the shipped anon key, would otherwise
-- walk straight through the gate. Same reasoning as 0068 fixing manage_token in
-- the database rather than in the app.
--
-- Both trigger functions are SECURITY DEFINER *by necessity*: anon has no SELECT
-- on `registrations` at all, so an invoker-rights trigger would find no matching
-- approved row and reject every legitimate join.
--
-- ⚠️ MIRROR ONLY — this file is a copy of
--    universal-platform/supabase/migrations/0070_webinar_registration_approval.sql,
--    kept here so a local `supabase db reset` reproduces the schema. The numbers
--    in THIS directory collide with universal-platform's own, so a `db push`
--    from this repo would no-op or collide against the shared project. Apply
--    webinar schema changes from universal-platform, never from here.
--
-- Idempotent and safe to re-run. Ends with sync_webinar_public_column_grants()
-- because it adds a `webinars` column — mandatory since 0068, or the public
-- pages lose their read.

-- ── Columns ───────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists require_approval boolean not null default false;

alter table public.registrations
  add column if not exists status text not null default 'approved';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'registrations_status_check'
  ) then
    alter table public.registrations
      add constraint registrations_status_check
      check (status in ('pending', 'approved', 'waitlisted', 'declined'));
  end if;
end
$$;

-- The host's registrations panel filters by status constantly.
create index if not exists registrations_webinar_status_idx
  on public.registrations (webinar_id, status);

-- ── Gate 1: a new registration's status is decided by the SERVER ──────────────
-- Overrides whatever the client sent. The anon register form inserts directly,
-- so this is the only thing stopping a crafted payload self-approving.
create or replace function public.set_registration_initial_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
begin
  select require_approval into v_requires
  from webinars where id = new.webinar_id;

  new.status := case when coalesce(v_requires, false) then 'pending' else 'approved' end;
  return new;
end;
$$;

drop trigger if exists registrations_set_initial_status on public.registrations;
create trigger registrations_set_initial_status
  before insert on public.registrations
  for each row execute function public.set_registration_initial_status();

-- ── Gate 2: no attendee row without an approved registration ─────────────────
-- The attendee row is what /w/<slug>/live checks, so this is the real access
-- boundary. Only enforced when the host asked for it, so ungated webinars are
-- completely unaffected.
create or replace function public.enforce_attendee_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
  v_status text;
begin
  select require_approval into v_requires
  from webinars where id = new.webinar_id;

  if not coalesce(v_requires, false) then
    return new;
  end if;

  select r.status into v_status
  from registrations r
  where r.webinar_id = new.webinar_id
    and lower(r.email) = lower(coalesce(new.email, ''))
  limit 1;

  if v_status = 'approved' then
    return new;
  end if;

  -- Coded messages so the app can tell "not registered" from "waiting on you"
  -- and show the right thing, rather than a generic failure.
  if v_status is null then
    raise exception 'approval_required: no registration found for this email'
      using errcode = 'P0001';
  end if;
  raise exception 'approval_required: registration is %', v_status
    using errcode = 'P0001';
end;
$$;

drop trigger if exists attendees_enforce_approval on public.attendees;
create trigger attendees_enforce_approval
  before insert on public.attendees
  for each row execute function public.enforce_attendee_approval();

-- ── Host sets a registration's status via the manage token ───────────────────
-- The token IS the authorisation, exactly as in the sibling RPCs (0003 / 0062 /
-- 0065). Returns the updated row so the panel can re-render without a refetch.
create or replace function public.set_registration_status_by_token(
  p_slug text,
  p_token uuid,
  p_registration_id uuid,
  p_status text
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar_id uuid;
  v_row registrations;
begin
  if p_status not in ('pending', 'approved', 'waitlisted', 'declined') then
    raise exception 'Invalid status %', p_status using errcode = 'P0001';
  end if;

  select id into v_webinar_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_webinar_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  update registrations
  set status = p_status
  where id = p_registration_id and webinar_id = v_webinar_id
  returning * into v_row;

  if v_row is null then
    raise exception 'Registration not found for this webinar' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

revoke all on function public.set_registration_status_by_token(text, uuid, uuid, text) from public;
grant execute on function public.set_registration_status_by_token(text, uuid, uuid, text)
  to anon, authenticated;

-- ── Let the registrant see their own status ──────────────────────────────────
-- Adding an OUT column changes the function's return type, which CREATE OR
-- REPLACE cannot do — it has to be dropped first. Same signature, so every
-- existing caller keeps working.
drop function if exists public.get_registration_by_join_token(uuid);

create function public.get_registration_by_join_token(
  p_token uuid
) returns table (
  registration_id uuid,
  webinar_id uuid,
  slug text,
  name text,
  email text,
  registered_at timestamptz,
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.webinar_id, w.slug, r.name, r.email, r.registered_at, r.status
  from registrations r
  join webinars w on w.id = r.webinar_id
  where r.join_token = p_token;
$$;

revoke all on function public.get_registration_by_join_token(uuid) from public;
grant execute on function public.get_registration_by_join_token(uuid)
  to anon, authenticated;

-- ── Extend update_webinar_by_token to accept require_approval ────────────────
-- Same body as 0066's definition, with 'require_approval' added to the
-- allow-list and the UPDATE. Un-listed keys are silently stripped, so the host's
-- toggle would be a no-op without this.
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
    'send_confirmation', 'send_reminders', 'require_approval'
  ];
  v_filtered jsonb;
  v_key text;
begin
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
    send_confirmation    = coalesce((v_filtered->>'send_confirmation')::boolean, send_confirmation),
    send_reminders       = coalesce((v_filtered->>'send_reminders')::boolean, send_reminders),
    require_approval     = coalesce((v_filtered->>'require_approval')::boolean, require_approval)
  where slug = p_slug and manage_token = p_token
  returning * into v_row;

  if v_row is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

-- ── MANDATORY since 0068: re-grant the public columns ────────────────────────
-- This migration added `require_approval` to `webinars`. Without this call the
-- new column has no grant and every public page's explicit column read breaks.
select public.sync_webinar_public_column_grants();
