-- IPAI Flow server-only Supabase grants variant
--
-- Use this after supabase/schema.sql when the app talks to Supabase only from
-- SvelteKit server code using SUPABASE_SERVICE_ROLE_KEY. This is safer than
-- granting public anon write access, but it is not a full RLS policy system.
--
-- Do not apply this if browser/client-side code needs to query Supabase
-- directly with the anon key.

begin;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

commit;
