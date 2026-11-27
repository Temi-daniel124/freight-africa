begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- Musa Haulage (owner Musa, drivers Sani and Bello) has a trip assigned to Sani; Emeka's owner is a stranger.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('31313131-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@musahaulage.ng', now(), '{"full_name": "Musa Danladi"}', now(), now()),
  ('31313131-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@musahaulage.ng', now(), '{"full_name": "Sani Bello"}', now(), now()),
  ('31313131-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bello@musahaulage.ng', now(), '{"full_name": "Bello Yusuf"}', now(), now()),
  ('31313131-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emeka@emeka.ng', now(), '{"full_name": "Emeka Obi"}', now(), now()),
  ('31313131-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ada@adastores.ng', now(), '{"full_name": "Ada Eze"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('31313131-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'gold'),
  ('31313131-0000-4000-8000-0000000000b2', 'transporter', 'Emeka Transport', 'new'),
  ('31313131-0000-4000-8000-0000000000a1', 'shipper', 'Ada Stores', null);
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('31313131-0000-4000-8000-0000000000b1', '31313131-0000-4000-8000-000000000001', null, 'owner', false),
  ('31313131-0000-4000-8000-0000000000b1', '31313131-0000-4000-8000-000000000002', null, 'driver', true),
  ('31313131-0000-4000-8000-0000000000b1', '31313131-0000-4000-8000-000000000003', null, 'driver', true),
  ('31313131-0000-4000-8000-0000000000b2', '31313131-0000-4000-8000-000000000004', null, 'owner', false),
  ('31313131-0000-4000-8000-0000000000a1', '31313131-0000-4000-8000-000000000005', 'owner', null, false);
insert into public.drivers (user_id, org_id, status) values
  ('31313131-0000-4000-8000-000000000002', '31313131-0000-4000-8000-0000000000b1', 'active'),
  ('31313131-0000-4000-8000-000000000003', '31313131-0000-4000-8000-0000000000b1', 'active')
on conflict (user_id) do update set org_id = excluded.org_id, status = 'active';

insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status, approved_at) values
  ('31313131-0000-4000-8000-0000000000c1', '31313131-0000-4000-8000-0000000000b1', 'KAN310XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'active', now());
insert into public.loads (id, ref, shipper_org_id, from_city_id, to_city_id, goods_category_id, truck_type_id, pickup_from, pickup_until, freight_kobo, fee_bps, fee_kobo, total_kobo, status)
values ('31313131-0000-4000-8000-0000000000d1', 'FA-31031', '31313131-0000-4000-8000-0000000000a1', (select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano'),
  (select id from public.goods_categories where code = 'rice_bags'), (select id from public.truck_types where code = 'flatbed_30t'), now() + interval '1 day', now() + interval '1 day 6 hours', 100000000, 300, 3000000, 103000000, 'matched');
insert into public.trips (id, ref, load_id, transporter_org_id, truck_id, driver_id, freight_kobo, commission_bps, commission_kobo, advance_bps, advance_kobo, status)
values ('31313131-0000-4000-8000-0000000000e1', 'FA-31031-T1', '31313131-0000-4000-8000-0000000000d1', '31313131-0000-4000-8000-0000000000b1', '31313131-0000-4000-8000-0000000000c1',
  '31313131-0000-4000-8000-000000000002', 100000000, 400, 4000000, 5000, 50000000, 'assigned');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "31313131-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select throws_ok($$select public.change_trip_driver('31313131-0000-4000-8000-0000000000e1', '31313131-0000-4000-8000-000000000003')$$, '42501', null, 'another business cannot change the driver');
select set_config('request.jwt.claims', '{"sub": "31313131-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.change_trip_driver('31313131-0000-4000-8000-0000000000e1', '31313131-0000-4000-8000-000000000003')$$, '42501', null, 'nor can a driver');
select set_config('request.jwt.claims', '{"sub": "31313131-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.change_trip_driver('31313131-0000-4000-8000-0000000000e1', '31313131-0000-4000-8000-000000000004')$$, '22023', null, 'only to one of their own active drivers');
select lives_ok($$select public.change_trip_driver('31313131-0000-4000-8000-0000000000e1', '31313131-0000-4000-8000-000000000003', 'Sani is unwell')$$, 'the owner hands the trip to Bello');
reset role;
select is((select driver_id from public.trips where id = '31313131-0000-4000-8000-0000000000e1'), '31313131-0000-4000-8000-000000000003'::uuid, 'Bello drives it now');
update public.trips set status = 'loaded', loaded_at = now() where id = '31313131-0000-4000-8000-0000000000e1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "31313131-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.change_trip_driver('31313131-0000-4000-8000-0000000000e1', '31313131-0000-4000-8000-000000000002')$$, '22023', null, 'not once the goods are loaded');

select * from finish();
rollback;
