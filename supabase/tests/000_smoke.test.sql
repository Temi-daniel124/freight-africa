begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select ok(exists (select 1 from pg_extension where extname = 'pg_cron'), 'pg_cron is installed');
select ok(exists (select 1 from pg_extension where extname = 'pg_net'), 'pg_net is installed');
select ok(exists (select 1 from pg_extension where extname = 'pgcrypto'), 'pgcrypto is installed');
select ok(
  exists (select 1 from information_schema.schemata where schema_name = 'private'),
  'the private schema exists'
);
select ok(
  not has_schema_privilege('anon', 'private', 'usage')
    and not has_schema_privilege('authenticated', 'private', 'usage'),
  'anon and authenticated cannot use the private schema'
);

create table public.smoke_default_privileges (id int);
select ok(
  not has_table_privilege('anon', 'public.smoke_default_privileges', 'select, insert, truncate, trigger')
    and not has_table_privilege('authenticated', 'public.smoke_default_privileges', 'select, insert, truncate, trigger')
    and not has_table_privilege('service_role', 'public.smoke_default_privileges', 'select, insert, truncate, trigger'),
  'new tables in public grant nothing by default'
);

select * from finish();

rollback;
