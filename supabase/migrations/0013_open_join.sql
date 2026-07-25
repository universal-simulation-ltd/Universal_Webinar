-- Universal Webinar — the open join link, with a kill switch (registration phase 8).
--
-- Resolves the phase-8 question the right way round. The door at /w/<slug> was
-- always open on an ungated room; that turned out to be a WANTED feature, not a
-- hole: a host shares that link in a newsletter beforehand and drops it in chat
-- during the session for last-minute joiners who never signed up. What was
-- missing was the host's ability to *control* it.
--
--   • webinars.open_join — default TRUE, so today's behaviour is unchanged.
--       Turning it off closes walk-up joining immediately, mid-session if need
--       be, without touching anyone who already registered.
--
-- ── The full entry rule after this migration ─────────────────────────────────
-- On an attendee insert:
--   1. An `approved` registration always gets in. (Their emailed join link keeps
--      working even after the open door is shut — that's the point of shutting
--      it.)
--   2. A registration that exists but is pending / waitlisted / declined is
--      rejected with its status. A waitlisted person must NOT be able to stroll
--      in through the open door — that would undo phase 7.
--   3. Otherwise this is a walk-up (no registration at all):
--        • require_approval  → rejected; a vetted room has no walk-ups.
--        • open_join = false → rejected; the host has closed the door.
--        • capacity full     → rejected; a walk-up can't exceed the seat limit.
--        • else              → allowed.
--
-- Rule 3's ordering matters: approval is stricter than the open door, so it wins.
--
-- In practice the app registers a walk-up first (so they appear in the host's
-- list and receive the follow-up email), which routes them through rules 1-2;
-- rule 3 is the backstop for a direct attendee insert.
--
-- ⚠️ MIRROR ONLY — a copy of universal-platform's 0074. Apply webinar schema
--    changes from universal-platform, never from here.
--
-- Idempotent and safe to re-run. Ends with sync_webinar_public_column_grants()
-- because it adds a `webinars` column — mandatory since 0068.

-- ── Column ────────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists open_join boolean not null default true;

-- ── Entry rule ────────────────────────────────────────────────────────────────
create or replace function public.enforce_attendee_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
  v_capacity integer;
  v_open boolean;
  v_status text;
  v_taken integer;
begin
  select require_approval, capacity, open_join
    into v_requires, v_capacity, v_open
  from webinars where id = new.webinar_id;

  select r.status into v_status
  from registrations r
  where r.webinar_id = new.webinar_id
    and lower(r.email) = lower(coalesce(new.email, ''))
  limit 1;

  -- 1. Approved registration — always in, open door or not.
  if v_status = 'approved' then
    return new;
  end if;

  -- 2. Registered but not approved — held, whatever the door is doing.
  if v_status is not null then
    raise exception 'approval_required: registration is %', v_status
      using errcode = 'P0001';
  end if;

  -- 3. Walk-up.
  if coalesce(v_requires, false) then
    raise exception 'approval_required: no registration found for this email'
      using errcode = 'P0001';
  end if;

  if not coalesce(v_open, true) then
    raise exception 'open_join_disabled: the host has closed walk-up joining'
      using errcode = 'P0001';
  end if;

  if v_capacity is not null then
    select count(*) into v_taken
    from registrations
    where webinar_id = new.webinar_id and status = 'approved';
    if v_taken >= v_capacity then
      raise exception 'webinar_full: no seats left'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

-- ── Extend update_webinar_by_token to accept open_join ───────────────────────
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
    'send_followup', 'open_join'
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
    send_followup        = coalesce((v_filtered->>'send_followup')::boolean, send_followup),
    open_join            = coalesce((v_filtered->>'open_join')::boolean, open_join)
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
