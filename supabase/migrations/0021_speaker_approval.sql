-- Universal Webinar — app-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0105_webinar_speaker_approval.sql`, which is the
-- copy that gets applied.
--
-- 0105 — Webinar: the host can put a raised hand on air, and take it back off.
--
-- 0097 shipped the speaker queue with cancel and block but deliberately NO
-- approve, and said why in its own header: promoting someone was meaningless
-- while nothing could put them on air, and a button that looked like it did
-- would have been a lie to the host. It asked for approval to be added "in the
-- same migration that makes the stage real".
--
-- The stage became real on 2026-07-30 (the LiveKit blocker turned out to be an
-- authorisation rule in `livekit-token`, not missing infrastructure). So this
-- is that migration. `livekit-token` already mints a publish-capable token for
-- an attendee whose `role` is 'speaker', so promotion is the whole mechanism —
-- there is nothing else to wire up.
--
-- ── Authorised by the MANAGE TOKEN, never by a session ──────────────────────
-- Same as every other host action, and for the reason written up against
-- `host_verified`: that is a column, not a session. It is written once and
-- stays true forever while the browser session expires, is absent on a second
-- device, and is gone after a sign-out. Worse, a host who ever joined their own
-- room as a guest holds an ANONYMOUS session, which sails through a
-- `to authenticated` check while carrying no email claim at all. The manage
-- token is the app's actual authorisation model.
--
-- ── Why approval can be refused ─────────────────────────────────────────────
-- Four states where "put them on air" must fail loudly rather than quietly do
-- something surprising:
--
--   * the request is no longer pending — someone already dealt with it, and a
--     second host (or a stale queue card) must not silently re-approve it;
--   * `speak_blocked` — the host has already said "stop asking". Blocking
--     clears pending requests, so this should be unreachable, but promoting
--     someone the host has actively silenced is exactly the surprise worth an
--     assertion. Note this flag is NOT `role = 'banned'`: it stops the asking
--     and leaves them watching and chatting;
--   * `role = 'banned'` — a ban does NOT clear this person's pending requests,
--     so a banned attendee can still be sitting in the queue. Promoting them
--     would un-ban them (the role column is the same one) AND hand them a
--     microphone. This one is genuinely reachable;
--   * `left_at is not null` — they were removed from the room by the admin
--     control room, which is the only thing that writes that column.
--
-- ── Taking someone back off air ─────────────────────────────────────────────
-- `revoke_speaker_by_token` exists because approval without it is a one-way
-- door: a host who promotes the wrong person, or whose speaker has finished
-- their question, would otherwise have no way back short of banning them out
-- of the room entirely — the same disproportionate answer 0097 added
-- `speak_blocked` to avoid. Demotion drops them to 'guest', and the client
-- re-mints their LiveKit token, so the one they hold stops being able to
-- publish.
--
-- `list_speakers_by_token` is what makes that button survive a page reload:
-- the queue RPC returns pending requests only, so without this the host loses
-- track of who is on air the moment they refresh.
--
-- All three return `setof attendees` / `attendees` rather than a hand-listed
-- `returns table (...)`, deliberately: a row type picks up new columns for
-- free, where a hand-listed one turns an omission into something silently
-- absent at runtime instead of a loud failure.
--
-- No `webinars` column is added here, so `sync_webinar_public_column_grants()`
-- is not needed (it is mandatory for any migration that does add one).
--
-- Idempotent and safe to re-run.

-- ── Put a raised hand on air ─────────────────────────────────────────────────
-- Resolves EVERY pending request from that person, not just the one clicked:
-- `speak_requests` has no unique constraint, so a guest who inserted twice from
-- the console would otherwise stay in the host's queue while already speaking.
create or replace function public.approve_speak_request_by_token(
  p_slug text,
  p_token uuid,
  p_request_id uuid
) returns attendees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar_id uuid;
  v_attendee_id uuid;
  v_attendee attendees;
begin
  select id into v_webinar_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_webinar_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  -- The webinar_id predicate matters: without it a valid token for webinar A
  -- could approve a request belonging to webinar B.
  select attendee_id into v_attendee_id
  from speak_requests
  where id = p_request_id
    and webinar_id = v_webinar_id
    and status = 'pending';

  if v_attendee_id is null then
    raise exception 'That request is no longer waiting' using errcode = 'P0001';
  end if;

  select * into v_attendee
  from attendees
  where id = v_attendee_id and webinar_id = v_webinar_id;

  if v_attendee is null then
    raise exception 'That person is no longer in this webinar' using errcode = 'P0001';
  end if;

  if v_attendee.speak_blocked then
    raise exception 'You have stopped this person asking to speak'
      using errcode = 'P0001';
  end if;

  if v_attendee.role = 'banned' then
    raise exception 'That person has been removed from the room'
      using errcode = 'P0001';
  end if;

  if v_attendee.left_at is not null then
    raise exception 'That person has left the room' using errcode = 'P0001';
  end if;

  update attendees
     set role = 'speaker'
   where id = v_attendee_id
     and webinar_id = v_webinar_id
  returning * into v_attendee;

  update speak_requests
     set status = 'approved', resolved_at = now()
   where webinar_id = v_webinar_id
     and attendee_id = v_attendee_id
     and status = 'pending';

  return v_attendee;
end;
$$;

revoke all on function public.approve_speak_request_by_token(text, uuid, uuid) from public;
grant execute on function public.approve_speak_request_by_token(text, uuid, uuid)
  to anon, authenticated;

-- ── Take them back off air ───────────────────────────────────────────────────
-- Back to 'guest', which is a plain viewer: still in the room, still chatting.
-- Deliberately does NOT set `speak_blocked` — "your turn is over" and "stop
-- asking" are different things, and the host has a separate control for the
-- second.
create or replace function public.revoke_speaker_by_token(
  p_slug text,
  p_token uuid,
  p_attendee_id uuid
) returns attendees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_webinar_id uuid;
  v_attendee attendees;
begin
  select id into v_webinar_id
  from webinars
  where slug = p_slug and manage_token = p_token;

  if v_webinar_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  -- `role = 'speaker'` in the predicate, not just the id: this must never be a
  -- way to turn a 'banned' attendee back into a 'guest' — that would be an
  -- un-ban dressed up as taking someone off air.
  update attendees
     set role = 'guest'
   where id = p_attendee_id
     and webinar_id = v_webinar_id
     and role = 'speaker'
  returning * into v_attendee;

  if v_attendee is null then
    raise exception 'That person is not on air' using errcode = 'P0001';
  end if;

  return v_attendee;
end;
$$;

revoke all on function public.revoke_speaker_by_token(text, uuid, uuid) from public;
grant execute on function public.revoke_speaker_by_token(text, uuid, uuid)
  to anon, authenticated;

-- ── Who is on air right now ──────────────────────────────────────────────────
-- Anyone removed from the room is excluded: their token is dead and the host
-- can do nothing useful with the row.
create or replace function public.list_speakers_by_token(
  p_slug text,
  p_token uuid
) returns setof attendees
language plpgsql
security definer
set search_path = public
stable
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
  select a.*
  from attendees a
  where a.webinar_id = v_webinar_id
    and a.role = 'speaker'
    and a.left_at is null
  order by a.joined_at;
end;
$$;

revoke all on function public.list_speakers_by_token(text, uuid) from public;
grant execute on function public.list_speakers_by_token(text, uuid)
  to anon, authenticated;
