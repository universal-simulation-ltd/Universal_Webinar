-- Universal Webinar — app-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0102_webinar_pin_lock.sql`, which is the
-- copy that gets applied.
--
-- 0102 — Webinar PIN lock (the "Phase 6" toggle that has been disabled since
-- the beginning).
--
-- A host can put a PIN on the room. Everyone entering must know it — including
-- people with an approved registration, because "only those with today's PIN
-- get in" is the entire point of the feature and an exception for registrants
-- would hollow it out.
--
-- ── The PIN must never be publicly readable ─────────────────────────────────
-- `entry_pin` joins `manage_token` as a column revoked from anon and
-- authenticated, so no client read of the base table can return it. The host
-- gets it back through the two token-gated paths that already return whole
-- rows (get_webinar_by_manage_token, update_webinar_by_token) — the caller had
-- to present the manage token to reach either.
--
-- `pin_required` is the public half: the join page has to know to ask, without
-- learning the answer. It is maintained by a trigger rather than by the app, so
-- the flag and the secret cannot drift apart.
--
-- ⚠️ sync_webinar_public_column_grants() is REDEFINED here to exclude
-- entry_pin. Calling the old version after this migration would re-grant it to
-- anon. That function is the single source of truth for which columns are
-- public — anything secret must be excluded there, not merely omitted from the
-- app's select list.
--
-- ── How it is enforced ──────────────────────────────────────────────────────
-- Not by the client. `join_webinar_with_pin` checks the PIN and, in the same
-- transaction, sets a local GUC that the attendee insert trigger looks for.
-- Nothing reachable over PostgREST can set that GUC, so an attendee row cannot
-- be inserted for a PIN-locked webinar by any other route — including a guest
-- calling the plain insert from the console, which is how a client-side check
-- would be bypassed in about a minute.
--
-- ⚠️ KNOWN LIMITATION: there is no rate limiting on the verify path. A short
-- numeric PIN is brute-forceable by a determined caller. The minimum length is
-- 4 and the UI suggests 6, but if this ever guards something that matters, the
-- fix is Turnstile on the join page or an attempts table — not a longer PIN.
--
-- Idempotent and safe to re-run.

alter table public.webinars
  add column if not exists entry_pin     text,
  add column if not exists pin_required  boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'webinars_entry_pin_length'
  ) then
    alter table public.webinars
      add constraint webinars_entry_pin_length
      check (entry_pin is null or char_length(entry_pin) between 4 and 16);
  end if;
end $$;

comment on column public.webinars.entry_pin is
  'Room PIN, plain text. NOT selectable by anon or authenticated — see '
  'sync_webinar_public_column_grants(), migrations 0067/0068/0102. Reaches the '
  'host only through the manage-token RPCs that return a whole row. Never add '
  'it to WEBINAR_COLUMNS, a view, or an RPC return type readable without the '
  'token.';
comment on column public.webinars.pin_required is
  'Public mirror of (entry_pin is not null), so the join page knows to ask '
  'without learning the answer. Maintained by a trigger — never set directly.';

-- ── Keep the flag honest ─────────────────────────────────────────────────────
create or replace function public.sync_webinar_pin_required()
returns trigger
language plpgsql
as $$
begin
  new.pin_required := new.entry_pin is not null;
  return new;
end;
$$;

drop trigger if exists webinars_sync_pin_required on public.webinars;
create trigger webinars_sync_pin_required
  before insert or update on public.webinars
  for each row execute function public.sync_webinar_pin_required();

-- Backfill any row that predates the trigger.
update public.webinars
   set pin_required = (entry_pin is not null)
 where pin_required is distinct from (entry_pin is not null);

-- ── entry_pin joins manage_token as a non-public column ──────────────────────
create or replace function public.sync_webinar_public_column_grants()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
  into v_cols
  from pg_attribute
  where attrelid = 'public.webinars'::regclass
    and attnum > 0
    and not attisdropped
    and attname not in ('manage_token', 'entry_pin');

  -- A table-level grant implicitly covers every column, including ones added
  -- later, so it has to go before the per-column grants mean anything.
  execute 'revoke select on table public.webinars from anon, authenticated';
  execute format(
    'grant select (%s) on table public.webinars to anon, authenticated',
    v_cols
  );
end;
$$;

revoke all on function public.sync_webinar_public_column_grants() from public;

-- ── The door ─────────────────────────────────────────────────────────────────
-- Extends 0070/0074's trigger with the PIN gate, placed FIRST: an approved
-- registrant without the PIN is still turned away, which is the point.
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
  v_pin_required boolean;
  v_status text;
  v_taken integer;
begin
  select require_approval, capacity, open_join, pin_required
    into v_requires, v_capacity, v_open, v_pin_required
  from webinars where id = new.webinar_id;

  -- 0. PIN. Cleared only by join_webinar_with_pin, in this transaction.
  if coalesce(v_pin_required, false)
     and coalesce(current_setting('app.webinar_pin_ok', true), '') <> new.webinar_id::text
  then
    raise exception 'pin_required: this webinar is locked with a PIN'
      using errcode = 'P0001';
  end if;

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

-- ── Entering a PIN-locked room ───────────────────────────────────────────────
-- Returns the attendee row, creating it if needed. Idempotent: someone who
-- reloads mid-session gets their existing row back rather than a duplicate or
-- an error.
create or replace function public.join_webinar_with_pin(
  p_slug  text,
  p_pin   text,
  p_name  text,
  p_email text
) returns attendees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_pin  text;
  v_uid  uuid := auth.uid();
  v_row  attendees;
begin
  if v_uid is null then
    raise exception 'not_signed_in: no session' using errcode = 'P0001';
  end if;

  select id, entry_pin into v_id, v_pin
  from webinars
  where slug = p_slug and archived_at is null;

  if v_id is null then
    raise exception 'no_such_webinar' using errcode = 'P0001';
  end if;

  -- A webinar with no PIN set should go through the ordinary join path; saying
  -- so plainly beats silently accepting any PIN.
  if v_pin is null then
    raise exception 'pin_not_set: this webinar has no PIN' using errcode = 'P0001';
  end if;

  if p_pin is null or btrim(p_pin) <> v_pin then
    raise exception 'pin_incorrect' using errcode = 'P0001';
  end if;

  -- Already in the room (a reload, or a second tab).
  select * into v_row from attendees
  where webinar_id = v_id and auth_user_id = v_uid
  limit 1;
  if v_row.id is not null then
    return v_row;
  end if;

  -- Transaction-local, and cleared automatically at commit. Nothing reachable
  -- over PostgREST can set this, which is what makes the trigger's check mean
  -- something.
  perform set_config('app.webinar_pin_ok', v_id::text, true);

  insert into attendees (webinar_id, name, email, auth_user_id)
  values (v_id, p_name, lower(btrim(p_email)), v_uid)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.join_webinar_with_pin(text, text, text, text) from public;
grant execute on function public.join_webinar_with_pin(text, text, text, text)
  to anon, authenticated;

-- ── Let the host set and clear the PIN ───────────────────────────────────────
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
    'send_followup', 'open_join', 'shared_doc_url', 'shared_doc_name',
    'kept_at', 'entry_pin'
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
    open_join            = coalesce((v_filtered->>'open_join')::boolean, open_join),
    shared_doc_url       = case
                             when v_filtered ? 'shared_doc_url'
                             then nullif(v_filtered->>'shared_doc_url', '')
                             else shared_doc_url
                           end,
    shared_doc_name      = case
                             when v_filtered ? 'shared_doc_name'
                             then nullif(v_filtered->>'shared_doc_name', '')
                             else shared_doc_name
                           end,
    kept_at              = case
                             when v_filtered ? 'kept_at'
                             then nullif(v_filtered->>'kept_at', '')::timestamptz
                             else kept_at
                           end,
    entry_pin            = case
                             when v_filtered ? 'entry_pin'
                             then nullif(btrim(v_filtered->>'entry_pin'), '')
                             else entry_pin
                           end
  where slug = p_slug and manage_token = p_token
  returning * into v_row;

  if v_row is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_webinar_by_token(text, uuid, jsonb) from public;
grant execute on function public.update_webinar_by_token(text, uuid, jsonb)
  to anon, authenticated;

-- ⚠️ Mandatory after adding any column to public.webinars (0067/0068), and it
-- must be the version defined ABOVE — the one that also withholds entry_pin.
select public.sync_webinar_public_column_grants();
