-- Universal Webinar — capacity actually gates entry (fixes a phase-7 hole).
--
-- Found by testing phase 7 end to end: on a webinar with a seat limit but NO
-- approval requirement, a waitlisted registrant still got an attendee row — and
-- the attendee row is exactly what /w/<slug>/live checks. So the seat limit
-- limited nothing; the waitlist was cosmetic.
--
-- Cause: 0070's enforce_attendee_approval() only engages when require_approval
-- is true. Capacity is *also* a gate, and it was never considered.
--
-- Rule after this migration: if a webinar is gated in ANY way — it requires
-- approval, or it caps seats — then entry needs an `approved` registration.
-- A webinar with neither is completely unaffected, which is still the default
-- and the overwhelmingly common case.
--
-- ⚠️ MIRROR ONLY — a copy of universal-platform's 0072. Apply webinar schema
--    changes from universal-platform, never from here.
--
-- Idempotent and safe to re-run. Adds no columns, so no grant sync is needed.

create or replace function public.enforce_attendee_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
  v_capacity integer;
  v_status text;
begin
  select require_approval, capacity into v_requires, v_capacity
  from webinars where id = new.webinar_id;

  -- Ungated and uncapped: the open-door behaviour every webinar had before
  -- phase 6. Nothing to check.
  if not coalesce(v_requires, false) and v_capacity is null then
    return new;
  end if;

  select r.status into v_status
  from registrations r
  where r.webinar_id = new.webinar_id
    and lower(r.email) = lower(coalesce(new.email, ''))
  limit 1;

  if v_status = 'approved' then
    return new;
  end if;

  -- Coded messages so the app can tell "not registered" from "waiting on the
  -- host" from "waiting for a seat", and say the right thing to the guest.
  if v_status is null then
    raise exception 'approval_required: no registration found for this email'
      using errcode = 'P0001';
  end if;
  raise exception 'approval_required: registration is %', v_status
    using errcode = 'P0001';
end;
$$;
