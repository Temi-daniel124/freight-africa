begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('22222222-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('22222222-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tunde@okaforfoods.ng', now(), '{"full_name": "Tunde Bello"}', now(), now());
insert into public.organizations (id, kind, name) values ('22222222-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd');
insert into public.organization_members (org_id, user_id, shipper_role) values
  ('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000001', 'owner'),
  ('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000002', 'booker');

set local role authenticated;
-- Just signed in (by PIN, say): a fresh sign-in is not a fresh check (security review).
select set_config('request.jwt.claims', format('{"sub": "22222222-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "22222222-0000-4000-8000-0000000000f1", "amr": [{"method": "otp", "timestamp": %s}]}', extract(epoch from now())::bigint), true);
select throws_ok($$select public.change_member_role('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000002', 'finance')$$, '28000', null, 'a role change needs a fresh check (D044)');
-- The server recorded a passed fresh check for this session.
reset role;
do $$ begin perform public.record_fresh_check('22222222-0000-4000-8000-000000000001', '22222222-0000-4000-8000-0000000000f1'); end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "22222222-0000-4000-8000-000000000001", "role": "authenticated", "session_id": "22222222-0000-4000-8000-0000000000f1"}', true);
select lives_ok($$select public.change_member_role('22222222-0000-4000-8000-0000000000a1', '22222222-0000-4000-8000-000000000002', 'finance')$$, 'and works right after it');

select throws_ok($$select public.record_fresh_check('22222222-0000-4000-8000-000000000001', gen_random_uuid())$$, '42501', null, 'the browser can never record a fresh check');
reset role;
do $$ begin perform public.fresh_try('22222222-0000-4000-8000-000000000002') from generate_series(1, 5); end $$;
select is(public.fresh_try('22222222-0000-4000-8000-000000000002'), false, 'five wrong authenticator codes an hour lock the fresh check');
select * from finish();
rollback;
