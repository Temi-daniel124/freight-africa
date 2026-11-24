begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('21212121-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('21212121-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@musahaulage.ng', now(), '{"full_name": "Sani Abubakar"}', now(), now());
insert into public.organizations (id, kind, name) values ('21212121-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values
  ('21212121-0000-4000-8000-0000000000b1', '21212121-0000-4000-8000-000000000001', 'owner', false),
  ('21212121-0000-4000-8000-0000000000b1', '21212121-0000-4000-8000-000000000002', 'driver', true);
update public.drivers set status = 'active' where user_id = '21212121-0000-4000-8000-000000000002';
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status) values
  ('21212121-0000-4000-8000-0000000000c1', '21212121-0000-4000-8000-0000000000b1', 'KAN123XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'active');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "21212121-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select lives_ok($$select public.assign_truck_driver('21212121-0000-4000-8000-0000000000c1', '21212121-0000-4000-8000-000000000002')$$, 'the owner assigns a driver');
select lives_ok($$select public.set_truck_paused('21212121-0000-4000-8000-0000000000c1', true)$$, 'and pauses the truck');
select is((select status::text from public.trucks where id = '21212121-0000-4000-8000-0000000000c1'), 'paused', 'it is paused');
select set_config('request.jwt.claims', '{"sub": "21212121-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.set_truck_paused('21212121-0000-4000-8000-0000000000c1', false)$$, '42501', null, 'a driver can''t resume it');
select throws_ok($$select public.assign_truck_driver('21212121-0000-4000-8000-0000000000c1', null)$$, '42501', null, 'nor change who drives');

reset role;
select * from finish();
rollback;
