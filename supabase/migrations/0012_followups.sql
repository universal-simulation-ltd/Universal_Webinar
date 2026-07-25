-- Universal Webinar — post-session follow-up emails.
--
-- Closes the loop after a webinar ends: everyone who registered hears from the
-- host once, with the recording link if there is one. Two variants, decided
-- server-side from whether an attendee row exists for that registrant:
--
--   • attended  → "thanks for coming", plus the recording to re-watch;
--   • no-show   → "sorry we missed you", plus the recording to catch up.
--
-- The no-show half is the point of the feature: those are the people a host
-- most wants to reach, and they're invisible in the registrations list today.
--
--   • webinars.send_followup    — host opt-out, default ON, independent of the
--       confirmation and reminder switches.
--   • registrations.followup_sent_at — the idempotency stamp, same shape as
--       confirmation_sent_at / reminder_*_sent_at. One follow-up per person,
--       ever, no matter how many times the sweep runs.
--
-- ── When it sends (the one real design decision) ─────────────────────────────
-- Not the instant a webinar ends: the recording link is the most valuable thing
-- in the email, and a host needs a moment to paste it in. But waiting for a
-- recording that never arrives would mean no follow-up at all. So the sweep
-- sends when EITHER the recording_url is set, OR the webinar ended more than 24
-- hours ago — hosts who add a recording get it included, hosts who don't still
-- get their follow-up the next day.
--
-- ⚠️ MIRROR ONLY — a copy of universal-platform's 0073. Apply webinar schema
--    changes from universal-platform, never from here.
--
-- Idempotent and safe to re-run. Ends with sync_webinar_public_column_grants()
-- because it adds a `webinars` column — mandatory since 0068.

-- ── Columns ───────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists send_followup boolean not null default true;

alter table public.registrations
  add column if not exists followup_sent_at timestamptz;

-- The sweep asks "which ended webinars still owe follow-ups?" every tick.
create index if not exists webinars_followup_sweep_idx
  on public.webinars (ended_at)
  where status = 'ended' and send_followup;

create index if not exists registrations_followup_pending_idx
  on public.registrations (webinar_id)
  where followup_sent_at is null;

-- ── Extend update_webinar_by_token to accept send_followup ───────────────────
-- Same body as 0071's, with 'send_followup' allow-listed. `recording_url` was
-- already allow-listed (since 0003) but had no UI until now — the host's new
-- recording field writes through this same RPC.
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
    'send_confirmation', 'send_reminders', 'require_approval', 'capacity',
    'send_followup'
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
    -- Nullable + clearable, so `?` containment rather than coalesce: a host
    -- must be able to remove a recording link they pasted by mistake.
    recording_url        = case
                             when v_filtered ? 'recording_url'
                             then nullif(v_filtered->>'recording_url', '')
                             else recording_url
                           end,
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
    require_approval     = coalesce((v_filtered->>'require_approval')::boolean, require_approval),
    capacity             = case
                             when v_filtered ? 'capacity'
                             then nullif(v_filtered->>'capacity', '')::integer
                             else capacity
                           end,
    send_followup        = coalesce((v_filtered->>'send_followup')::boolean, send_followup)
  where slug = p_slug and manage_token = p_token
  returning * into v_row;

  if v_row is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

-- ── MANDATORY since 0068 ─────────────────────────────────────────────────────
select public.sync_webinar_public_column_grants();
