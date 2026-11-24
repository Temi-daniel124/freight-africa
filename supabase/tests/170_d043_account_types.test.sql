begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('17171717-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emeka@example.com', now(), '{"full_name": "Emeka Nwosu"}', now(), now()),
  ('17171717-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bola@example.com', now(), '{"full_name": "Bola Ade"}', now(), now()),
  ('17171717-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@example.com', now(), '{"full_name": "Sani Musa"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "17171717-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$update public.profiles set joining_as = 'owner_driver' where id = '17171717-0000-4000-8000-000000000001'$$, '23514', null, 'owner_driver is no longer a joining choice (D043)');
select throws_ok($$update public.profiles set joining_as = 'agent' where id = '17171717-0000-4000-8000-000000000001'$$, '23514', null, 'agents are not offered at sign-up (D043)');
update public.profiles set joining_as = 'owner' where id = '17171717-0000-4000-8000-000000000001';
select lives_ok($$select public.create_organization('transporter', 'Nwosu Haulage')$$, 'an owner creates a truck business');

select is((select is_driver from public.organization_members where user_id = '17171717-0000-4000-8000-000000000001'), false, 'not driving by default');
select lives_ok($$select public.set_i_drive((select org_id from public.organization_members where user_id = '17171717-0000-4000-8000-000000000001'), true)$$, 'the owner switches on I drive my own truck');
select is((select is_driver from public.organization_members where user_id = '17171717-0000-4000-8000-000000000001'), true, 'which adds the Drive tab (is_driver)');
select is((select count(*)::int from public.drivers where user_id = '17171717-0000-4000-8000-000000000001'), 1, 'and gives them a driver record');

-- Someone outside the business can't switch it for themselves there.
select set_config('request.jwt.claims', '{"sub": "17171717-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.set_i_drive((select org_id from public.organization_members where user_id = '17171717-0000-4000-8000-000000000001' limit 1), true)$$, '42501', null, 'only owners and admins of that business');

-- Bola drives for another business; switching on here would move (and unpause) that record.
reset role;
insert into public.organizations (id, kind, name) values ('17171717-0000-4000-8000-0000000000aa', 'transporter', 'Ade Trucks');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('17171717-0000-4000-8000-0000000000aa', '17171717-0000-4000-8000-000000000002', 'driver', true);
insert into public.organization_members (org_id, user_id, transporter_role) select org_id, '17171717-0000-4000-8000-000000000002', 'manager' from public.organization_members where user_id = '17171717-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "17171717-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.set_i_drive((select org_id from public.organization_members where user_id = '17171717-0000-4000-8000-000000000001' limit 1), true)$$, '42501', 'you already drive for another business', 'a driver of another business can''t move their record here');
reset role;
select * from finish();
rollback;
