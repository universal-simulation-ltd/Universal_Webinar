-- Universal Webinar — the host can put a document on the stage.
--
-- App-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0098_webinar_shared_document.sql`,
-- which is the copy that gets applied.
--
-- "Share screen" has been a disabled Phase 4 stub since the beginning, so a
-- host currently has no way to show anything at all. A shared PDF or image is
-- the cheapest thing that actually works — no LiveKit, no media server — and
-- for a lot of webinars a deck IS the presentation.
--
-- ── Who is allowed to upload ────────────────────────────────────────────────
-- Writes require an AUTH SESSION, not the manage token. That sounds like a
-- break from every other *_by_token RPC here, but it costs the host nothing:
-- verifying by OTP is already compulsory before going live (`host_verified`),
-- and `verifyHostOtp` creates a real Supabase session. The alternative — an
-- anon-writable bucket keyed only on a path segment — would let anyone upload
-- into any webinar's folder, since storage policies can't see the manage token.
-- So the ownership test is the same predicate 0062 uses for registrations:
-- lower(host_email) = lower(the JWT's email).
--
-- ⚠️ `webinar_docs_can_write` uses public.try_uuid, NOT a raw ::uuid cast.
-- Every policy on storage.objects is OR'd into one expression evaluated for
-- EVERY write to that table, and Postgres may run this branch's cast before the
-- `bucket_id` guard that was meant to make it unreachable. A raw cast here
-- would break uploads in unrelated buckets — that is exactly the 0092/0093
-- bug, and 0093 ends with an assertion that no unguarded cast survives.
--
-- ── Read access is public, deliberately ─────────────────────────────────────
-- The bucket is public with an unguessable random filename, matching poll-logos
-- and org-logos. A webinar document is by definition being shown to a room, and
-- signed URLs would need refreshing for the length of a session. The host UI
-- says plainly that anyone with the link can open it, and Remove deletes it.
--
-- ── What is NOT here ────────────────────────────────────────────────────────
-- No page synchronisation. Every viewer scrolls the document themselves. Host-
-- driven paging needs a realtime channel the guests already have but the
-- manage-token host does not, and it is a separate decision from "can a host
-- show a document at all".
--
-- Idempotent and safe to re-run.

-- ── Columns ──────────────────────────────────────────────────────────────────
alter table public.webinars
  add column if not exists shared_doc_url  text,
  add column if not exists shared_doc_name text;

comment on column public.webinars.shared_doc_url is
  'Public URL of the document currently on the stage, or NULL for none. '
  'Uploaded to the webinar-docs bucket by an OTP-verified host.';
comment on column public.webinars.shared_doc_name is
  'Original filename, shown to guests so they know what they are looking at.';

-- ── Bucket ───────────────────────────────────────────────────────────────────
-- 25 MB: comfortably a slide deck with images, well under the 50 MB Supabase
-- Free-plan ceiling, and small enough that a guest on mobile data can open it.
-- Images are downscaled client-side before upload; PDFs are not — see the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'webinar-docs',
  'webinar-docs',
  true,
  25 * 1024 * 1024,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Ownership test ───────────────────────────────────────────────────────────
-- Security definer so it can read `webinars` regardless of that table's own
-- grants, and so the body is never inlined into the policy expression.
create or replace function public.webinar_docs_can_write(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from webinars w
    where w.id = public.try_uuid((storage.foldername(p_name))[1])
      and w.host_email is not null
      and lower(w.host_email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.webinar_docs_can_write(text) from public;
grant execute on function public.webinar_docs_can_write(text) to authenticated;

-- ── Policies ─────────────────────────────────────────────────────────────────
-- Read: public, mirroring the bucket. Guests are anonymous-auth'd but the
-- registration/confirmation emails can also link straight to it.
drop policy if exists webinar_docs_public_read on storage.objects;
create policy webinar_docs_public_read on storage.objects
  for select using (bucket_id = 'webinar-docs');

drop policy if exists webinar_docs_host_insert on storage.objects;
create policy webinar_docs_host_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'webinar-docs'
    and public.webinar_docs_can_write(name)
  );

drop policy if exists webinar_docs_host_update on storage.objects;
create policy webinar_docs_host_update on storage.objects
  for update to authenticated
  using      (bucket_id = 'webinar-docs' and public.webinar_docs_can_write(name))
  with check (bucket_id = 'webinar-docs' and public.webinar_docs_can_write(name));

drop policy if exists webinar_docs_host_delete on storage.objects;
create policy webinar_docs_host_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'webinar-docs' and public.webinar_docs_can_write(name));

-- ── Let the host set and clear it through their manage token ─────────────────
-- The UPLOAD needs a session; recording WHICH document is on the stage does
-- not, and routing it through the same RPC as every other setting keeps the
-- page's save path uniform. Both columns are nullable-clearing (like
-- recording_url) so "Remove" is an ordinary patch.
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
    'send_followup', 'open_join', 'shared_doc_url', 'shared_doc_name'
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

-- ⚠️ Mandatory after adding any column to public.webinars (0067/0068): the
-- table-level SELECT grant was revoked, so a new column is unreadable by
-- anon/authenticated until this re-issues the per-column grants.
select public.sync_webinar_public_column_grants();
