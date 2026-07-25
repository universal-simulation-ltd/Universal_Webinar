-- Universal Webinar — take `webinars.manage_token` away from anon.
-- Part 2 of 2; see 0067 for the vulnerability write-up and the two helpers this
-- file leans on.
--
-- ⚠️ MIRROR ONLY — this file is a copy of
--    universal-platform/supabase/migrations/0068_webinar_manage_token_not_public.sql,
--    kept here so a local `supabase db reset` reproduces the schema. The numbers
--    in THIS directory collide with universal-platform's own 0001-0010, so a
--    `db push` from this repo would no-op or collide against the shared project.
--    Apply webinar schema changes from universal-platform, never from here.
--
-- ⚠️ ORDERING: apply this only AFTER the matching Universal_Webinar release is
--    deployed. It is the breaking half — anything still issuing `select *`
--    against `webinars` as anon or authenticated starts failing the moment it
--    lands. 0067 + the app deploy are both safe to do ahead of time.
--
-- The fix is column-level: anon and authenticated keep SELECT on every public
-- column and lose it on `manage_token` alone. Doing it in the database rather
-- than in the app is the point — `webinars` is also in the `supabase_realtime`
-- publication, and PostgREST is reachable directly with the shipped anon key,
-- so an app-side "just stop selecting it" would leave both of those paths wide
-- open. Privileges cover every reader at once.
--
-- Consequences, both handled in the matching Universal_Webinar release:
--
--   1. `select *` on webinars now fails for anon/authenticated with "permission
--      denied for column manage_token" — PostgREST passes `*` straight through
--      to SQL. Every base-table read must name its columns. That is a loud,
--      immediate failure rather than a silent one, which is what we want from a
--      fail-closed change.
--   2. Nothing can read the token back after an INSERT, so the client mints it
--      (crypto.randomUUID(), the same 122 bits of CSPRNG entropy as
--      gen_random_uuid()) and supplies it with the insert. The column keeps its
--      default for any other writer.
--
-- Idempotent and safe to re-run. No data changes; existing manage tokens keep
-- working. Rotating them — they have been publicly readable, so they should be
-- treated as compromised — invalidates every saved /host/w/<slug>?token=… link
-- and is deliberately left as a separate, host-visible decision.

select public.sync_webinar_public_column_grants();

comment on column public.webinars.manage_token is
  'Host secret: sole authorisation for update_webinar_by_token / '
  'list_registrations_by_token. NOT selectable by anon or authenticated — see '
  'sync_webinar_public_column_grants(), migrations 0067/0068. Never add it back '
  'to a client-readable column list, view or RPC return type.';
