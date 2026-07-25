-- Universal Webinar — custom registration questions (registration phase 3).
--
-- Lets a host add their own questions to the registration form (e.g. "Company",
-- "What do you hope to learn?", a dropdown of options). Registrants answer them
-- when they sign up, and the host sees the answers in their registrations panel.
--
--   • webinars.custom_questions  — the host-defined question set, a JSON array of
--       { id, label, type: 'text'|'textarea'|'select', required, options?[] }.
--   • registrations.custom_answers — the registrant's answers, a JSON object
--       keyed by question id → answer string.
--
-- The registration row is inserted directly by the (anon) register form, so no
-- RPC change is needed to STORE answers — the new column just rides along.
-- Hosts SET their questions via update_webinar_by_token (unverified hosts) or a
-- direct insert on create, so this migration also adds 'custom_questions' to
-- that RPC's allow-list.
--
-- Idempotent and safe to re-run. The webinar tables live in the shared project;
-- this ALTER is additive against the already-live tables (universal-platform
-- owns the tracked webinar-schema lineage — cf. 0062_webinar_registration_list).

-- ── Columns ───────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists custom_questions jsonb not null default '[]'::jsonb;

alter table public.registrations
  add column if not exists custom_answers jsonb not null default '{}'::jsonb;

-- ── Extend update_webinar_by_token to accept custom_questions ──────────────────
-- Same body as 0003's definition (create-or-replace against the live function),
-- with 'custom_questions' added to the allow-list and the UPDATE.
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
    'host_name', 'company_name', 'logo_url', 'custom_questions'
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
                           end
  where slug = p_slug and manage_token = p_token
  returning * into v_row;

  if v_row is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;
