-- Universal Webinar — reminder emails (registration phase 5).
--
-- Phase 4 emails a registrant once, when they save their seat. This adds the
-- nudge before the session actually starts: a ~24h-out reminder and a ~1h-out
-- reminder, both carrying the same per-registrant join link (join_token) the
-- confirmation used, sent by the scheduled process-webinar-reminders function.
--
--   • registrations.reminder_24h_sent_at / reminder_1h_sent_at — one stamp per
--       reminder slot. These are the idempotency guards, exactly as
--       confirmation_sent_at is for phase 4: the sweep only ever picks up rows
--       whose slot is still null, so a cron run that overlaps a previous one
--       (or a retry after a partial failure) can't mail anyone twice.
--   • webinars.send_reminders — host opt-out, default ON, independent of
--       send_confirmation so a host can keep one and drop the other.
--
-- Registrants never write these columns — anon has INSERT but no UPDATE on
-- registrations, and the sweep runs with the service role. No RPC needs to
-- change to READ them either: the host's list_registrations_by_token returns
-- `setof registrations`, so the new columns ride along automatically.
--
-- Idempotent and safe to re-run. The webinar tables live in the shared platform
-- project; these ALTERs are additive against the already-live tables
-- (universal-platform owns the tracked webinar-schema lineage — cf. 0062/0064/0065).
--
-- ⚠️ MIRROR ONLY — this file is a copy of
--    universal-platform/supabase/migrations/0066_webinar_reminders.sql, kept
--    here so a local `supabase db reset` reproduces the schema. The numbers in
--    THIS directory collide with universal-platform's own 0001-0008, so a
--    `db push` from this repo would no-op or collide against the shared project.
--    Apply webinar schema changes from universal-platform, never from here.

-- ── Columns ───────────────────────────────────────────────────────────────────
alter table public.registrations
  add column if not exists reminder_24h_sent_at timestamptz;

alter table public.registrations
  add column if not exists reminder_1h_sent_at timestamptz;

alter table public.webinars
  add column if not exists send_reminders boolean not null default true;

-- ── Sweep index ───────────────────────────────────────────────────────────────
-- The reminder sweep asks "which upcoming webinars start within the next 24h?"
-- on every cron tick. Partial on the two constants in that predicate so the
-- index stays small — ended/live rooms and opted-out hosts are never candidates.
create index if not exists webinars_reminder_sweep_idx
  on public.webinars (scheduled_at)
  where status = 'scheduled' and send_reminders;

-- Registrations are then fetched per webinar, filtered to the slot that's still
-- unsent. webinar_id is already indexed by the FK; this covers the null checks.
create index if not exists registrations_reminder_pending_idx
  on public.registrations (webinar_id)
  where reminder_24h_sent_at is null or reminder_1h_sent_at is null;

-- ── Extend update_webinar_by_token to accept send_reminders ───────────────────
-- Same body as 0065's definition (create-or-replace against the live function),
-- with 'send_reminders' added to the allow-list and the UPDATE. Keys that aren't
-- allow-listed are silently stripped, so the host's Manage-page toggle would be
-- a no-op without this step.
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
    'send_confirmation', 'send_reminders'
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
    send_confirmation    = coalesce((v_filtered->>'send_confirmation')::boolean, send_confirmation),
    send_reminders       = coalesce((v_filtered->>'send_reminders')::boolean, send_reminders)
  where slug = p_slug and manage_token = p_token
  returning * into v_row;

  if v_row is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;
