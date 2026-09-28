-- Universal Webinar — app-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0192_webinar_host_email_not_public.sql`, which is the
-- copy that gets applied.
--
-- =============================================================================
-- 0192_webinar_host_email_not_public.sql — Universal Webinar: the host's email
-- address and the recording link stop being publicly readable.
--
-- THE BUG. `webinars` has a `for select to anon, authenticated using (true)`
-- policy (the public registration / join / live pages read by slug), and since
-- 0067/0068/0102 the grant is column-level: every column EXCEPT `manage_token`
-- and `entry_pin`. So the shipped anon key returned every host's address:
--
--   curl "$PROJECT/rest/v1/webinars?select=slug,host_email" -H "apikey: <anon>"
--
-- — for every webinar on the platform, not just one whose link you hold,
-- because the policy is `true`. Reproduced against prod on 2026-09-28 before
-- this migration. No public page ever displays host_email; only the host's own
-- Manage page does, and it reads the row through get_webinar_by_manage_token.
--
-- THE RECORDING LINK GOES TOO. `recording_url` is pasted by the host on the
-- wrap-up page "and it goes out in the follow-up email to everyone who
-- registered" (WrapUp.tsx). It is not shown on any attendee page — the
-- follow-up email (process-webinar-reminders, service role) is its only
-- delivery route. Leaving it readable let anyone enumerate every webinar's
-- recording, including webinars whose registration needs host approval, so it
-- is revoked alongside host_email. (0 of 8 webinars on prod had one set when
-- this was written.)
--
-- THE PATTERN IS manage_token's. sync_webinar_public_column_grants() (0067,
-- widened by 0102) is the one place the public column list is decided; it
-- gains two names. Every later migration that adds a column still calls it,
-- so the exclusion cannot be lost by a revoke that the next re-grant undoes.
-- The host already reads all four private columns through definer RPCs that
-- return the whole row: get_webinar_by_manage_token, update_webinar_by_token,
-- archive_webinar_by_token, verify_webinar_host.
--
-- ⚠️ THE TRAP THIS MIGRATION HAS TO CLEAR FIRST. Three `registrations`
-- policies (0062: host read / update / delete, to authenticated) check
-- ownership with a subquery:
--
--   exists (select 1 from webinars w where w.id = registrations.webinar_id
--           and lower(w.host_email) = lower(auth.jwt() ->> 'email'))
--
-- A sub-SELECT inside a policy runs with the CALLER's privileges, so once
-- host_email is revoked that subquery fails with "permission denied" — and
-- because permissive policies are planned together, it would fail EVERY
-- authenticated read of registrations, not just a host's. (Verified on prod
-- with temp tables: a policy subquery on a column the role cannot select
-- raises 42501. A policy on webinars ITSELF that references host_email — the
-- two "verified host" update/delete policies — is NOT affected: a table's own
-- policy expressions are not column-privilege-checked; also verified.)
-- So the ownership test moves into a SECURITY DEFINER helper that reads the
-- column as its owner and returns only a boolean about the caller.
--
-- ROLLOUT. The Universal_Webinar release that drops host_email and
-- recording_url from WEBINAR_COLUMNS must be live BEFORE this is pushed: the
-- old bundle names both columns in every public select, and naming a revoked
-- column fails the whole query (the loud-failure design 0068 relies on).
-- =============================================================================

-- ── 1. Ownership test that does not need the caller to read host_email ───────
create or replace function public.webinar_hosted_by_caller(p_webinar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- auth.jwt() ->> 'email' is null for anon and for anonymous sessions;
  -- `lower(x) = null` is null, so exists() is false — never an error.
  select exists (
    select 1
      from webinars w
     where w.id = p_webinar_id
       and lower(w.host_email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.webinar_hosted_by_caller(uuid) from public;
revoke all on function public.webinar_hosted_by_caller(uuid) from anon;
-- The policies below are `to authenticated` and run as the caller, so the
-- caller needs EXECUTE. It answers only "is the signed-in email this
-- webinar's host?", which the caller could already learn by trying.
grant execute on function public.webinar_hosted_by_caller(uuid) to authenticated;

comment on function public.webinar_hosted_by_caller(uuid) is
  'Universal Webinar (0192): true when the signed-in email is the host_email of '
  'the given webinar. SECURITY DEFINER so RLS policies on other tables can ask '
  'without the caller holding SELECT on webinars.host_email, which is revoked.';

-- ── 2. The three registrations policies, same meaning, via the helper ───────
drop policy if exists "registrations host read" on public.registrations;
create policy "registrations host read" on public.registrations
  for select to authenticated
  using (public.is_admin() or public.webinar_hosted_by_caller(webinar_id));

drop policy if exists "registrations host update" on public.registrations;
create policy "registrations host update" on public.registrations
  for update to authenticated
  using      (public.is_admin() or public.webinar_hosted_by_caller(webinar_id))
  with check (public.is_admin() or public.webinar_hosted_by_caller(webinar_id));

drop policy if exists "registrations host delete" on public.registrations;
create policy "registrations host delete" on public.registrations
  for delete to authenticated
  using (public.is_admin() or public.webinar_hosted_by_caller(webinar_id));

-- ── 3. The public column list loses host_email and recording_url ───────────
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
    -- Private to the host (read via the manage-token RPCs): 0067, 0102, 0192.
    and attname not in ('manage_token', 'entry_pin', 'host_email', 'recording_url');

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

select public.sync_webinar_public_column_grants();

-- Belt and braces: a column-level grant made outside the helper would survive
-- the table-level revoke above, so revoke the two columns by name as well.
revoke select (host_email, recording_url) on table public.webinars from anon, authenticated;

comment on column public.webinars.host_email is
  'Host''s address. NOT selectable by anon or authenticated (0192) — read it '
  'through get_webinar_by_manage_token; ownership checks in policies use '
  'webinar_hosted_by_caller(). Never add it back to WEBINAR_COLUMNS, a view '
  'or an RPC return type reachable without the manage token.';

comment on column public.webinars.recording_url is
  'Recording link, delivered to registrants by the follow-up email. NOT '
  'selectable by anon or authenticated (0192); the host reads it through the '
  'manage-token RPCs.';
