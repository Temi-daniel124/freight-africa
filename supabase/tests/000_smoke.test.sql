begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

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

select * from finish();

rollback;
