-- Foundation: extensions, the private schema, and UTC time (BUILD.md step 0.7).

-- pg_cron and pg_net run the jobs and the job dispatcher (docs/ARCHITECTURE.md).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Internal functions live here, out of reach of the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Time is stored in UTC as timestamptz and shown in Africa/Lagos time by the app (AGENT.md section 6).
alter database postgres set timezone to 'UTC';
