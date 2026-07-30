-- Universal Webinar — the host panel can see who actually turned up.
--
-- App-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0096_webinar_attendance_by_token.sql`,
-- which is the copy that gets applied. See that file's header for the full
-- reasoning; the short version:
--
--   • The registrations panel could show confirmed / reminded / followed up but
--     not attended. `attendees` is unreachable from a manage-token session (its
--     policies are `to authenticated`), and 0078's `webinar_stats_by_token`
--     only returns counts.
--   • New function rather than reshaping `list_registrations_by_token`, which
--     returns `setof registrations` and so picks up new columns for free —
--     converting it to `returns table (...)` would hand-list every column and
--     make an omission silently invisible at runtime.
--   • "Attended" is decided by LOWERCASED EMAIL, matching 0078's stats RPC and
--     the follow-up pass of `process-webinar-reminders`. Walk-ups fall out of
--     the same result: any attendance row whose email matches no registration.
--
-- Idempotent and safe to re-run.

create or replace function public.webinar_attendance_by_token(
  p_slug text,
  p_token uuid
) returns table (
  name text,
  email text,
  first_joined_at timestamptz,
  last_left_at timestamptz
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
  select
    -- One row per person, not per join: rejoining after a dropout inserts a
    -- second attendee row, and a host reading the list wants people.
    (array_agg(a.name  order by a.joined_at desc))[1],
    (array_agg(a.email order by a.joined_at desc))[1],
    min(a.joined_at),
    -- Still in the room on any open session ⇒ no leave time yet.
    case when bool_or(a.left_at is null) then null else max(a.left_at) end
  from attendees a
  where a.webinar_id = v_id
  group by lower(a.email)
  order by min(a.joined_at);
end;
$$;

revoke all on function public.webinar_attendance_by_token(text, uuid) from public;
grant execute on function public.webinar_attendance_by_token(text, uuid)
  to anon, authenticated;
