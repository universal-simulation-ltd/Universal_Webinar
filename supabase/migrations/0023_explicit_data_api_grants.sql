-- Universal Webinar — app-numbered mirror of the tracked platform migration
-- `universal-platform/supabase/migrations/0305_explicit_data_api_grants.sql`, which is the
-- copy that gets applied.
--
-- =============================================================================
-- Grant the Data API roles explicitly on every Webinar table.
--
-- Supabase used to grant new tables in `public` to anon, authenticated and
-- service_role automatically; from 2026-10-30 it no longer does, for new
-- tables and sequences. 0001 relied on the automatic grants, so a schema
-- rebuilt from these migrations would leave every table unreachable through
-- supabase-js. This writes down the grants the live tables hold today
-- (including the column-level ones from 0022), so it changes nothing on an
-- existing project.

do $$
declare
  g record;
begin
  for g in select * from (values
    ('public.attendees', 'GRANT ALL ON TABLE "public"."attendees" TO "anon"'),
    ('public.attendees', 'GRANT ALL ON TABLE "public"."attendees" TO "authenticated"'),
    ('public.attendees', 'GRANT ALL ON TABLE "public"."attendees" TO "service_role"'),
    ('public.messages', 'GRANT ALL ON TABLE "public"."messages" TO "anon"'),
    ('public.messages', 'GRANT ALL ON TABLE "public"."messages" TO "authenticated"'),
    ('public.messages', 'GRANT ALL ON TABLE "public"."messages" TO "service_role"'),
    ('public.reactions', 'GRANT ALL ON TABLE "public"."reactions" TO "anon"'),
    ('public.reactions', 'GRANT ALL ON TABLE "public"."reactions" TO "authenticated"'),
    ('public.reactions', 'GRANT ALL ON TABLE "public"."reactions" TO "service_role"'),
    ('public.registrations', 'GRANT ALL ON TABLE "public"."registrations" TO "anon"'),
    ('public.registrations', 'GRANT ALL ON TABLE "public"."registrations" TO "authenticated"'),
    ('public.registrations', 'GRANT ALL ON TABLE "public"."registrations" TO "service_role"'),
    ('public.speak_requests', 'GRANT ALL ON TABLE "public"."speak_requests" TO "anon"'),
    ('public.speak_requests', 'GRANT ALL ON TABLE "public"."speak_requests" TO "authenticated"'),
    ('public.speak_requests', 'GRANT ALL ON TABLE "public"."speak_requests" TO "service_role"'),
    ('public.webinar_secrets', 'GRANT ALL ON TABLE "public"."webinar_secrets" TO "service_role"'),
    ('public.webinars', 'GRANT REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT ALL ON TABLE "public"."webinars" TO "service_role"'),
    ('public.webinars', 'GRANT SELECT("id") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("id") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("slug") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("slug") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("title") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("title") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("description") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("description") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("scheduled_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("scheduled_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("started_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("started_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("ended_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("ended_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("status") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("status") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("allow_speak_requests") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("allow_speak_requests") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("show_guest_count") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("show_guest_count") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("created_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("created_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("updated_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("updated_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("created_by") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("created_by") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("host_name") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("host_name") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("company_name") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("company_name") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("logo_url") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("logo_url") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("host_verified") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("host_verified") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("custom_questions") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("custom_questions") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("send_confirmation") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("send_confirmation") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("send_reminders") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("send_reminders") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("require_approval") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("require_approval") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("capacity") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("capacity") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("send_followup") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("send_followup") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("open_join") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("open_join") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("archived_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("archived_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("purge_after") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("purge_after") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("kept_at") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("kept_at") ON TABLE "public"."webinars" TO "authenticated"'),
    ('public.webinars', 'GRANT SELECT("pin_required") ON TABLE "public"."webinars" TO "anon"'),
    ('public.webinars', 'GRANT SELECT("pin_required") ON TABLE "public"."webinars" TO "authenticated"')
  ) as v(rel, stmt)
  loop
    if to_regclass(g.rel) is not null then
      execute g.stmt;
    end if;
  end loop;
end $$;
