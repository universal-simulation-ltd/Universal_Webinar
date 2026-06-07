-- Phase 4 — LiveKit video + speaker queue
-- Adds guest-facing RLS for speak_requests and an admin RPC to approve/deny
-- a request and atomically update the attendee's role.
-- Run after 0003_multihost.sql. Idempotent.

-- ──────────────────────────────────────────────────────────────────────────────
-- speak_requests RLS
-- ──────────────────────────────────────────────────────────────────────────────

drop policy if exists "speak_requests admin" on speak_requests;
drop policy if exists "speak_requests admin all" on speak_requests;
drop policy if exists "speak_requests guest insert" on speak_requests;
drop policy if exists "speak_requests guest select own" on speak_requests;

-- Admin owns everything.
create policy "speak_requests admin all" on speak_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A guest can insert a speak request for themselves (one pending request at a
-- time; uniqueness enforced in application logic — no DB constraint here since
-- a new request after a denial should be allowed).
create policy "speak_requests guest insert" on speak_requests
  for insert to authenticated
  with check (
    public.is_attendee(webinar_id)
    and exists (
      select 1 from attendees a
      where a.id = speak_requests.attendee_id
        and a.webinar_id = speak_requests.webinar_id
        and a.auth_user_id = auth.uid()
        and a.role = 'guest'
    )
  );

-- A guest can read their own requests (so the UI can show pending/approved/denied).
create policy "speak_requests guest select own" on speak_requests
  for select to authenticated
  using (
    exists (
      select 1 from attendees a
      where a.id = speak_requests.attendee_id
        and a.auth_user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- RPC: admin approves or denies a speak request atomically
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.resolve_speak_request(
  p_request_id uuid,
  p_status speak_request_status
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only' using errcode = '42501';
  end if;

  -- Resolve the request.
  update speak_requests
  set status = p_status, resolved_at = now()
  where id = p_request_id
  returning attendee_id into v_attendee_id;

  if v_attendee_id is null then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  -- If approved, promote attendee to speaker; if revoked, demote back to guest.
  if p_status = 'approved' then
    update attendees set role = 'speaker' where id = v_attendee_id;
  elsif p_status in ('denied', 'revoked') then
    update attendees set role = 'guest' where id = v_attendee_id;
  end if;
end;
$$;

revoke all on function public.resolve_speak_request(uuid, speak_request_status) from public;
grant execute on function public.resolve_speak_request(uuid, speak_request_status) to authenticated;
