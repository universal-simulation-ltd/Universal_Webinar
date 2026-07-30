-- Universal Webinar — app-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0103_webinar_pin_precheck.sql`, which is the
-- copy that gets applied.
--
-- 0103 — Check the PIN before registering the person typing it.
--
-- Found by driving the join form in a browser: a guest who fumbles the PIN
-- still ends up in the host's registrations list, and therefore in the
-- post-session follow-up mailing. They never got into the room. Emailing
-- someone "sorry we missed you" about a session they were locked out of is the
-- kind of thing that reads as a data leak to the recipient.
--
-- The cause is ordering, not the PIN gate. Join.tsx registers first on purpose
-- (0070/0074): for an approval-gated webinar, registering is precisely what
-- puts a walk-up into the host's pending queue, so it cannot simply be moved
-- after the join. What it needs is a cheap way to reject the wrong PIN before
-- anything is written.
--
-- This is an oracle for guessing, but no more so than join_webinar_with_pin
-- already was — that only needs an anonymous session, which is free. The
-- rate-limiting caveat in 0102 stands and covers both.
--
-- Idempotent and safe to re-run.

create or replace function public.webinar_pin_matches(
  p_slug text,
  p_pin  text
) returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_pin text;
  v_locked boolean;
begin
  select entry_pin, pin_required into v_pin, v_locked
  from webinars
  where slug = p_slug and archived_at is null;

  -- No such webinar, or no PIN on it: nothing to fail. The caller carries on to
  -- the ordinary join path, where the real gates live.
  if not coalesce(v_locked, false) then
    return true;
  end if;

  return p_pin is not null and btrim(p_pin) = v_pin;
end;
$$;

revoke all on function public.webinar_pin_matches(text, text) from public;
grant execute on function public.webinar_pin_matches(text, text) to anon, authenticated;

comment on function public.webinar_pin_matches(text, text) is
  'Pre-flight for the join form so a wrong PIN does not create a registration. '
  'NOT the enforcement point — that is the attendees trigger plus '
  'join_webinar_with_pin (0102), which this cannot replace or bypass.';
