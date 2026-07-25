-- Universal Webinar — capacity + automatic waitlisting (registration phase 7).
--
-- Phase 6 gave a host `waitlisted` as a status they set by hand. This adds the
-- automation: a seat limit, automatic waitlisting once it's reached, and
-- automatic promotion off the waitlist when a seat frees.
--
--   • webinars.capacity — NULL means unlimited (the default, so every existing
--       webinar is unchanged). A positive integer caps `approved` registrations.
--
-- Two behaviours, both in triggers for the same reason phase 6's gates are:
-- the register form is an anon INSERT straight onto the table, so anything
-- enforced in the client is advisory only.
--
-- ── The rule that needs stating: promotion respects approval ──────────────────
-- If a host requires approval AND caps seats, auto-promotion must NOT hand out
-- an approved seat — that would let the waitlist launder someone past the
-- vetting the host explicitly asked for. A promoted registrant on a gated
-- webinar goes to `pending` (back in the host's queue, now with a seat
-- available); on an ungated one they go straight to `approved`.
--
-- ⚠️ MIRROR ONLY — a copy of universal-platform's 0071. Apply webinar schema
--    changes from universal-platform, never from here; the numbers in this
--    directory collide with that repo's own lineage.
--
-- Idempotent and safe to re-run. Ends with sync_webinar_public_column_grants()
-- because it adds a `webinars` column — mandatory since 0068.

-- ── Column ────────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists capacity integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webinars_capacity_check'
  ) then
    alter table public.webinars
      add constraint webinars_capacity_check
      check (capacity is null or capacity > 0);
  end if;
end
$$;

-- ── How many seats are taken / free ───────────────────────────────────────────
-- `approved` is the only status that occupies a seat. pending/waitlisted people
-- are explicitly NOT holding one — otherwise a host who never gets round to
-- their queue would silently block the room.
create or replace function public.webinar_free_seats(p_webinar_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_capacity integer;
  v_taken integer;
begin
  select capacity into v_capacity from webinars where id = p_webinar_id;
  if v_capacity is null then
    return null; -- unlimited
  end if;
  select count(*) into v_taken
  from registrations
  where webinar_id = p_webinar_id and status = 'approved';
  return greatest(v_capacity - v_taken, 0);
end;
$$;

revoke all on function public.webinar_free_seats(uuid) from public;
grant execute on function public.webinar_free_seats(uuid) to anon, authenticated;

-- ── Gate 1 (extended from 0070): initial status now considers capacity ───────
-- Order matters: a full room waitlists even when approval is on, because there
-- is no seat to approve them into yet. They surface in the host's queue as
-- `waitlisted` and get promoted to `pending` when one frees.
create or replace function public.set_registration_initial_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
  v_capacity integer;
  v_taken integer;
begin
  select require_approval, capacity into v_requires, v_capacity
  from webinars where id = new.webinar_id;

  if v_capacity is not null then
    select count(*) into v_taken
    from registrations
    where webinar_id = new.webinar_id and status = 'approved';

    if v_taken >= v_capacity then
      new.status := 'waitlisted';
      return new;
    end if;
  end if;

  new.status := case when coalesce(v_requires, false) then 'pending' else 'approved' end;
  return new;
end;
$$;

-- ── Promotion: fill freed seats from the waitlist, oldest first ──────────────
-- Fires when a seat is given up — an approved registration moving to any other
-- status, or being deleted outright.
--
-- The promotion is itself an UPDATE on registrations, which re-fires this
-- trigger. Rather than rely on that recursion (which would promote one per
-- level and could nest deeply), the guard below bails out on any nested
-- invocation and a single loop fills every free seat in one pass.
create or replace function public.promote_webinar_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar_id uuid;
  v_capacity integer;
  v_requires boolean;
  v_taken integer;
  v_next uuid;
begin
  -- Only our own promotion UPDATEs recurse into here; let them through without
  -- re-running the whole sweep.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  v_webinar_id := case when tg_op = 'DELETE' then old.webinar_id else new.webinar_id end;

  select capacity, require_approval into v_capacity, v_requires
  from webinars where id = v_webinar_id;

  if v_capacity is null then
    return null; -- unlimited: nothing to promote into
  end if;

  loop
    select count(*) into v_taken
    from registrations
    where webinar_id = v_webinar_id and status = 'approved';

    exit when v_taken >= v_capacity;

    select id into v_next
    from registrations
    where webinar_id = v_webinar_id and status = 'waitlisted'
    order by registered_at asc
    limit 1;

    exit when v_next is null;

    update registrations
    set status = case when coalesce(v_requires, false) then 'pending' else 'approved' end
    where id = v_next;

    -- A gated webinar promotes into the host's queue, which does NOT consume a
    -- seat — so the loop would spin forever promoting the whole waitlist to
    -- pending. One promotion per freed seat is the correct behaviour there.
    exit when coalesce(v_requires, false);
  end loop;

  return null;
end;
$$;

drop trigger if exists registrations_promote_waitlist on public.registrations;
create trigger registrations_promote_waitlist
  after update of status or delete on public.registrations
  for each row
  when (pg_trigger_depth() <= 1)
  execute function public.promote_webinar_waitlist();

-- ── Extend update_webinar_by_token to accept capacity ────────────────────────
-- Same body as 0070's, with 'capacity' allow-listed. Nullable, so it uses the
-- `?` containment test rather than coalesce — otherwise a host could never
-- clear the cap back to unlimited.
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
    'send_confirmation', 'send_reminders', 'require_approval', 'capacity'
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
    require_approval     = coalesce((v_filtered->>'require_approval')::boolean, require_approval),
    capacity             = case
                             when v_filtered ? 'capacity'
                             then nullif(v_filtered->>'capacity', '')::integer
                             else capacity
                           end
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
