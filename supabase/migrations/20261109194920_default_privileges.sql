-- New objects in public grant nothing by default, so every table and function states its own grants
-- next to its RLS policies. New Supabase projects are already close to this; a fresh CI stack is not,
-- and the drift job needs both to match.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;
