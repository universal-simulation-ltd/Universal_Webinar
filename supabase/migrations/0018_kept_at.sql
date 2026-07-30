-- Universal Webinar — app-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0099_webinar_kept_at.sql`, which is
-- the copy that gets applied.
--
-- "save to cloud" as an explicit choice, not an absence.
--
-- After a session ends the host has exactly two exits, and until now only one
-- of them was a button:
--
--   Close & free my token  → archive_webinar_by_token (0078). The hold is
--                            released so they can run another webinar, and on
--                            the free tier the row and its registrations are
--                            destroyed 30 days later.
--   Save to cloud          → keep the webinar and everyone in it, indefinitely.
--                            The token stays held, so no new webinar until they
--                            come back and release it.
--
-- The second one was previously just… not pressing the first. Nothing recorded
-- the decision, so the page could not tell "deliberately kept" from "hasn't got
-- round to it" and had to keep nagging either way. `kept_at` is that record.
--
-- ⚠️ Save to cloud must NOT set `archived_at`. archive_webinar_by_token returns
-- early on an already-archived row ("closing twice must not double-refund"), so
-- an archived-but-kept webinar could never release its token afterwards — the
-- host would be permanently unable to run another. Keeping it unarchived also
-- keeps it out of purge_archived_webinars, which is exactly what "save" means.
--
-- Idempotent and safe to re-run.

alter table public.webinars
  add column if not exists kept_at timestamptz;

comment on column public.webinars.kept_at is
  'Host chose "save to cloud" after the session: keep this webinar and its '
  'registrations indefinitely, and keep holding the token. Deliberately NOT '
  'archived_at — see 0099. Cleared if they later close and free the token.';

-- ── Allow the host to set/clear it through their manage token ────────────────
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
    'kept_at'
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

-- ── Closing clears the flag ──────────────────────────────────────────────────
-- A host who saved to cloud and later releases the token has stopped keeping
-- it; leaving kept_at set would make the closed row claim otherwise.
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
      ended_at    = coalesce(ended_at, now()),
      kept_at     = null
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.archive_webinar_by_token(text, uuid) from public;
grant execute on function public.archive_webinar_by_token(text, uuid) to anon, authenticated;

-- ⚠️ Mandatory after adding any column to public.webinars (0067/0068).
select public.sync_webinar_public_column_grants();
