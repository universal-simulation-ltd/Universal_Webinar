-- Universal Webinar — host speaker-queue management over a manage token.
--
-- App-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0097_webinar_speaker_queue_by_token.sql`,
-- which is the copy that gets applied.
--
-- `speak_requests` is entirely `to authenticated` (an "admin all" policy plus
-- guest self-insert/select), so the host manage page — which authenticates with
-- a `manage_token`, not an auth session — could not read the queue at all. Its
-- "Speaker queue" card has been a stub since Phase 4. Same problem, and the
-- same solution, as 0096's attendance RPC.
--
-- ── Why a new `speak_blocked` column and not role = 'banned' ────────────────
-- 'banned' means banned from the ROOM: Live.tsx redirects that attendee out to
-- `?banned=1`. What a host actually wants when someone keeps raising their hand
-- is much narrower — stop the requests, let them keep watching. Overloading
-- 'banned' would silently eject a paying attendee for being keen, so this is a
-- separate, reversible flag.
--
-- It is enforced by a TRIGGER, not just by hiding the button: the guest client
-- inserts into `speak_requests` directly under its own RLS policy, so a blocked
-- attendee could otherwise re-raise their hand from the console.
--
-- ── What the host deliberately CANNOT do here ───────────────────────────────
-- There is no "approve" path in these RPCs. Approving is meaningless until the
-- LiveKit stage lands (still a Phase 4/5 stub), and a button that looks like it
-- promotes someone to speaker while nothing can actually put them on air would
-- be a lie to the host. Cancelling and blocking are honest queue management.
-- Add approval in the same migration that makes the stage real.
--
-- Idempotent and safe to re-run.

-- ── The flag ─────────────────────────────────────────────────────────────────
alter table public.attendees
  add column if not exists speak_blocked boolean not null default false;

comment on column public.attendees.speak_blocked is
  'Host has stopped this attendee requesting to speak. NOT a ban: they keep '
  'watching and chatting. Enforced by the speak_requests insert trigger.';

-- ── Enforcement ──────────────────────────────────────────────────────────────
create or replace function public.reject_blocked_speak_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from attendees a
    where a.id = new.attendee_id and a.speak_blocked
  ) then
    raise exception 'The host has turned off speaking requests for you'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists speak_requests_reject_blocked on public.speak_requests;
create trigger speak_requests_reject_blocked
  before insert on public.speak_requests
  for each row execute function public.reject_blocked_speak_request();

-- ── Read the queue with a manage token ───────────────────────────────────────
-- Joined to `attendees` because a request row is just two ids — the host needs
-- a name to act on. Pending only: resolved requests are history, and the card
-- is a work queue.
create or replace function public.list_speak_requests_by_token(
  p_slug text,
  p_token uuid
) returns table (
  request_id uuid,
  attendee_id uuid,
  name text,
  email text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return query
  select sr.id, sr.attendee_id, a.name, a.email, sr.created_at
  from speak_requests sr
  join attendees a on a.id = sr.attendee_id
  where sr.webinar_id = v_id
    and sr.status = 'pending'
  order by sr.created_at;
end;
$$;

revoke all on function public.list_speak_requests_by_token(text, uuid) from public;
grant execute on function public.list_speak_requests_by_token(text, uuid)
  to anon, authenticated;

-- ── Cancel a request ─────────────────────────────────────────────────────────
-- Only 'denied' is accepted, for the reason in the header. The webinar_id
-- predicate matters: without it a valid token for webinar A could resolve a
-- request belonging to webinar B.
create or replace function public.deny_speak_request_by_token(
  p_slug text,
  p_token uuid,
  p_request_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  update speak_requests
     set status = 'denied', resolved_at = now()
   where id = p_request_id
     and webinar_id = v_id
     and status = 'pending';
end;
$$;

revoke all on function public.deny_speak_request_by_token(text, uuid, uuid) from public;
grant execute on function public.deny_speak_request_by_token(text, uuid, uuid)
  to anon, authenticated;

-- ── Stop (or allow again) someone asking ─────────────────────────────────────
-- Blocking also clears whatever they have pending, or the request the host just
-- silenced would sit in the queue forever.
create or replace function public.set_speak_block_by_token(
  p_slug text,
  p_token uuid,
  p_attendee_id uuid,
  p_blocked boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  update attendees
     set speak_blocked = p_blocked
   where id = p_attendee_id
     and webinar_id = v_id;

  if p_blocked then
    update speak_requests
       set status = 'denied', resolved_at = now()
     where webinar_id = v_id
       and attendee_id = p_attendee_id
       and status = 'pending';
  end if;
end;
$$;

revoke all on function public.set_speak_block_by_token(text, uuid, uuid, boolean) from public;
grant execute on function public.set_speak_block_by_token(text, uuid, uuid, boolean)
  to anon, authenticated;
