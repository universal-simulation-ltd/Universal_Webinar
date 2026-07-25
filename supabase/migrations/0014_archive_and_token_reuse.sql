-- Universal Webinar — closing a webinar frees its token; archive + auto-purge.
--
-- The Webinar token was a one-way spend: hosting burned the org's free token
-- permanently ("live hosting costs money"). James's call reverses that — the
-- token becomes REUSABLE, but only once the host has finished with the webinar
-- and closed it. They get the statistics, the attendee list and the emails out
-- first; closing then hands the token back so they can run another.
--
-- ── What "closing" does to the data (decided 2026-07-25) ─────────────────────
-- NOT a hard delete. Freeing the token is the only route to running another
-- webinar, so hosts are pushed to close — and any who close before exporting
-- would lose their registrant list irreversibly. Instead:
--
--   • webinars.archived_at — set on close. The webinar disappears from public
--       view immediately and the token comes back immediately.
--   • webinars.purge_after — when the row (and its registrations/attendees)
--       actually get destroyed. now() + 30 days for a free-tier host; NULL for
--       a paying one, who keeps their history indefinitely so they can compare
--       runs of the same webinar over time.
--
-- 30 days gives an accidental close a recovery window, and keeps registrant PII
-- from lingering forever under accounts that have stopped paying — the
-- data-protection answer as well as the product one.
--
-- ── How the tier is decided, given webinars.created_by is NULL ───────────────
-- There is no reliable webinar→org link: created_by was never populated. But a
-- free-tier host is precisely the one who took a token hold, so the PRESENCE of
-- a hold for ('webinar', slug) is itself the free-tier signal, and it carries
-- the org_id. It has to be read BEFORE the hold is released, which is why
-- archive_webinar_by_token computes purge_after and frees the token in one
-- transaction.
--
-- ── Why archiving releases the token itself ─────────────────────────────────
-- release_token_hold() authenticates via auth.uid(), but a host manages their
-- webinar through a manage_token with no Universal ID session — they'd archive
-- and silently never get their token back. This function is security definer
-- and derives the org from the hold, so the manage_token is the authorisation,
-- consistent with every other *_by_token RPC. It mirrors release_token_hold's
-- refund logic exactly: free_app holds return the app token, credit-funded ones
-- return a credit.
--
-- ⚠️ MIRROR ONLY — a copy of universal-platform's 0078. Apply webinar schema
--    changes from universal-platform, never from here.
--
-- Idempotent and safe to re-run. Ends with sync_webinar_public_column_grants()
-- because it adds `webinars` columns — mandatory since 0068.

-- ── Columns ───────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists archived_at timestamptz;

alter table public.webinars
  add column if not exists purge_after timestamptz;

create index if not exists webinars_purge_idx
  on public.webinars (purge_after)
  where purge_after is not null;

-- ── Make the webinar spend refundable from here on ───────────────────────────
-- Currently a no-op: no webinar hold has ever existed in prod (the gate only
-- fires for tier='free' and the only webinar belongs to an enterprise org).
-- Kept so anything created between this migration and the app release still
-- benefits, and so the ledger is consistent with the new model.
update public.token_holds
  set refundable = true
  where app = 'webinar' and refundable = false;

update public.app_free_tokens
  set status = 'held', updated_at = now()
  where app = 'webinar' and status = 'spent';

-- ── Stats for the host, before they close ────────────────────────────────────
-- The host needs to see what they'd be giving up. Attendance is the interesting
-- half and isn't otherwise readable through a manage token.
create or replace function public.webinar_stats_by_token(
  p_slug text,
  p_token uuid
) returns table (
  registered integer,
  approved integer,
  pending integer,
  waitlisted integer,
  declined integer,
  attended integer,
  no_show integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_id uuid;
begin
  select id into v_id from webinars
  where slug = p_slug and manage_token = p_token;

  if v_id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  return query
  with r as (select * from registrations where webinar_id = v_id),
       a as (select distinct lower(email) as email from attendees where webinar_id = v_id)
  select
    (select count(*) from r)::int,
    (select count(*) from r where status = 'approved')::int,
    (select count(*) from r where status = 'pending')::int,
    (select count(*) from r where status = 'waitlisted')::int,
    (select count(*) from r where status = 'declined')::int,
    (select count(*) from r where lower(r.email) in (select email from a))::int,
    -- No-show counts only people who were actually let in: someone the host
    -- declined or left on the waitlist never had the chance to turn up.
    (select count(*) from r where status = 'approved'
        and lower(r.email) not in (select email from a))::int;
end;
$$;

revoke all on function public.webinar_stats_by_token(text, uuid) from public;
grant execute on function public.webinar_stats_by_token(text, uuid) to anon, authenticated;

-- ── Close: archive + hand the token back ─────────────────────────────────────
create or replace function public.archive_webinar_by_token(
  p_slug text,
  p_token uuid
) returns webinars
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row        webinars;
  v_org_id     uuid;
  v_tier       text;
  v_refundable boolean;
  v_funded     text;
  v_purge      timestamptz;
begin
  select * into v_row from webinars
  where slug = p_slug and manage_token = p_token;

  if v_row.id is null then
    raise exception 'Invalid slug or manage token' using errcode = 'P0001';
  end if;

  if v_row.archived_at is not null then
    return v_row; -- already closed; closing twice must not double-refund
  end if;

  -- Read the hold BEFORE releasing it — it's the only link to the org, and
  -- therefore the only way to know whether this host keeps their history.
  select org_id into v_org_id
  from token_holds
  where app = 'webinar' and resource_id = p_slug
  limit 1;

  if v_org_id is not null then
    select tier into v_tier from subscriptions where org_id = v_org_id;

    delete from token_holds
    where org_id = v_org_id and app = 'webinar' and resource_id = p_slug
    returning refundable, funded_by into v_refundable, v_funded;

    if coalesce(v_refundable, false) then
      if v_funded = 'free_app' then
        update app_free_tokens set status = 'available', updated_at = now()
          where org_id = v_org_id and app = 'webinar' and status = 'held';
      else
        update subscriptions set credits = credits + 1 where org_id = v_org_id;
      end if;
    end if;
  end if;

  -- Free tier loses the history after a month; paying hosts keep it. No hold at
  -- all means we can't prove they're on free, so we keep the data — erring
  -- toward not destroying someone's records.
  if v_tier = 'free' then
    v_purge := now() + interval '30 days';
  else
    v_purge := null;
  end if;

  update webinars
  set archived_at = now(),
      purge_after = v_purge,
      status      = 'ended',
      ended_at    = coalesce(ended_at, now())
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.archive_webinar_by_token(text, uuid) from public;
grant execute on function public.archive_webinar_by_token(text, uuid) to anon, authenticated;

-- ── The purge sweep ──────────────────────────────────────────────────────────
-- Plain SQL on pg_cron rather than an Edge Function: no HTTP hop and no shared
-- secret to paste into the schedule, which is what silently broke
-- workplace-reminders-daily for months. Nothing here is owner-gated.
create or replace function public.purge_archived_webinars()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with doomed as (
    select id from webinars
    where purge_after is not null and purge_after <= now()
  ), del_att as (
    delete from attendees where webinar_id in (select id from doomed)
  ), del_reg as (
    delete from registrations where webinar_id in (select id from doomed)
  )
  delete from webinars where id in (select id from doomed);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_archived_webinars() from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('purge-archived-webinars')
      where exists (select 1 from cron.job where jobname = 'purge-archived-webinars');
    perform cron.schedule(
      'purge-archived-webinars',
      '15 3 * * *',
      $cron$select public.purge_archived_webinars();$cron$
    );
  end if;
end
$$;

-- ── Extend update_webinar_by_token: archived_at / purge_after are NOT settable
-- by a host patch — closing goes through archive_webinar_by_token so the token
-- refund and the tier decision can't be bypassed. Nothing to add to the
-- allow-list; noted here so the omission reads as deliberate.

-- ── MANDATORY since 0068 ─────────────────────────────────────────────────────
select public.sync_webinar_public_column_grants();
