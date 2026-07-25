-- Universal Webinar — groundwork for taking `webinars.manage_token` private.
-- Part 1 of 2; 0068 is the part that actually changes who can read what.
--
-- ⚠️ MIRROR ONLY — this file is a copy of
--    universal-platform/supabase/migrations/0067_webinar_manage_token_gate_prep.sql,
--    kept here so a local `supabase db reset` reproduces the schema. The numbers
--    in THIS directory collide with universal-platform's own 0001-0010, so a
--    `db push` from this repo would no-op or collide against the shared project.
--    Apply webinar schema changes from universal-platform, never from here.
--
-- The bug (pre-existing since 0003, found 2026-07-25): `webinars` has had a
-- `for select to anon, authenticated using (true)` policy since 0001, and a
-- table-level SELECT grant covers every column — including `manage_token`. The
-- shipped anon key was therefore enough to read any host's secret:
--
--   curl "$PROJECT/rest/v1/webinars?select=manage_token" -H "apikey: <anon>"
--
-- That token is the SOLE authorisation for `update_webinar_by_token` (edit the
-- webinar, take it live, end it) and `list_registrations_by_token` (every
-- registrant's name, email and custom_answers). Anyone who could open a public
-- registration page could hijack the session and exfiltrate the registrant list.
--
-- This file is deliberately ADDITIVE ONLY — applying it changes no existing
-- behaviour and cannot break a running frontend. It ships the two things the
-- fixed app needs to exist *before* it is deployed:
--
--   • get_webinar_by_manage_token() — the read counterpart of
--     update_webinar_by_token, because once the column is private the Manage
--     page can no longer fetch the row and compare the token client-side.
--   • sync_webinar_public_column_grants() — defined here, CALLED in 0068.
--
-- Rollout: push 0067 → deploy the matching Universal_Webinar release (it reads
-- explicit column lists that work fine under the old grants too) → push 0068.
-- Doing it in that order means there is no window in which the live site is
-- talking to a schema it doesn't understand.

-- ── Read a webinar by its manage token ────────────────────────────────────────
-- security definer so it can match against the column that 0068 makes private;
-- holding the token IS the authorisation, exactly as in the sibling RPCs from
-- 0003 / 0062. Returns NULL (not an error) for a wrong slug or token, so an
-- ordinary bad link doesn't surface as a thrown exception.
--
-- Returning the whole `webinars` row, manage_token included, leaks nothing: the
-- caller had to present that exact token to get here.
create or replace function public.get_webinar_by_manage_token(
  p_slug text,
  p_token uuid
) returns webinars
language sql
security definer
set search_path = public
stable
as $$
  select w.*
  from webinars w
  where w.slug = p_slug
    and w.manage_token = p_token;
$$;

revoke all on function public.get_webinar_by_manage_token(text, uuid) from public;
grant execute on function public.get_webinar_by_manage_token(text, uuid)
  to anon, authenticated;

-- ── The column-grant helper ───────────────────────────────────────────────────
-- Defining it here is inert; 0068 calls it. It exists as a function rather than
-- as a literal column list in a migration because a hand-written list silently
-- goes stale: the next migration to add a column to `webinars` would leave that
-- column ungranted and break the public pages.
--
-- ANY MIGRATION THAT ADDS A COLUMN TO public.webinars MUST END WITH:
--   select public.sync_webinar_public_column_grants();
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
    and attname <> 'manage_token';

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
