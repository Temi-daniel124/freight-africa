begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('22222222-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('22222222-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tunde@okaforfoods.ng', now(), '{"full_name": "Tunde Bello"}', now(), now());
insert into public.organizations (id, kind, name) values ('22222222-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd');
insert into public.organization_members (org_id, user_id, shipper_role) values
  ('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000001', 'owner'),
  ('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000002', 'booker');

set local role authenticated;
-- Signed in two hours ago (a PIN-opened app, no fresh check since).
select set_config('request.jwt.claims', format('{"sub": "22222222-0000-4000-8000-000000000001", "role": "authenticated", "amr": [{"method": "otp", "timestamp": %s}]}', extract(epoch from now() - interval '2 hours')::bigint), true);
select throws_ok($$select public.change_member_role('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000002', 'finance')$$, '28000', null, 'a role change needs a fresh check (D044)');
-- Just confirmed with the authenticator (or an email code).
select set_config('request.jwt.claims', format('{"sub": "22222222-0000-4000-8000-000000000001", "role": "authenticated", "amr": [{"method": "totp", "timestamp": %s}]}', extract(epoch from now())::bigint), true);
select lives_ok($$select public.change_member_role('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000002', 'finance')$$, 'and works right after it');

reset role;
select * from finish();
rollback;
