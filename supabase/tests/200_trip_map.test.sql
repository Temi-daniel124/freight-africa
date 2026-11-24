begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('20202020-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('20202020-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('20202020-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@example.com', now(), '{"full_name": "Someone Else"}', now(), now()),
  ('20202020-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@musahaulage.ng', now(), '{"full_name": "Sani Abubakar"}', now(), now());
update public.profiles set phone = '+2348031234567' where id = '20202020-0000-4000-8000-000000000002';
update public.profiles set phone = '+2348035550000' where id = '20202020-0000-4000-8000-000000000004';
insert into public.organizations (id, kind, name) values
  ('20202020-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd'),
  ('20202020-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('20202020-0000-4000-8000-0000000000a1', '20202020-0000-4000-8000-000000000001', 'owner', null, false),
  ('20202020-0000-4000-8000-0000000000b1', '20202020-0000-4000-8000-000000000002', null, 'owner', true),
  ('20202020-0000-4000-8000-0000000000b1', '20202020-0000-4000-8000-000000000004', null, 'driver', true);
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status) values
  ('20202020-0000-4000-8000-0000000000c1', '20202020-0000-4000-8000-0000000000b1', 'KAN123XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'active');
insert into public.loads (id, ref, shipper_org_id, from_city_id, to_city_id, goods_category_id, weight_kg, truck_type_id, pickup_from, pickup_until, freight_kobo, fee_bps, fee_kobo, total_kobo, status)
values ('20202020-0000-4000-8000-0000000000d1', 'FA-TEST1', '20202020-0000-4000-8000-0000000000a1', (select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano'),
  (select id from public.goods_categories where code = 'rice_bags'), 24000, (select id from public.truck_types where code = 'flatbed_30t'), now(), now() + interval '1 day', 100000000, 0, 0, 100000000, 'matched');
insert into public.load_stops (load_id, seq, kind, city_id, address_text, contact_name, contact_phone) values
  ('20202020-0000-4000-8000-0000000000d1', 0, 'pickup', (select id from public.cities where slug = 'lagos'), 'Apapa port, Lagos', 'Tunde Bello', '+2348039876543'),
  ('20202020-0000-4000-8000-0000000000d1', 1, 'dropoff', (select id from public.cities where slug = 'kano'), 'Dawanau market, Kano', 'Musa Danladi', '+2348031112222');
insert into public.trips (id, ref, load_id, transporter_org_id, truck_id, driver_id, freight_kobo, commission_bps, commission_kobo, advance_bps, advance_kobo, status)
values ('20202020-0000-4000-8000-0000000000e1', 'FA-TEST1-T1', '20202020-0000-4000-8000-0000000000d1', '20202020-0000-4000-8000-0000000000b1', '20202020-0000-4000-8000-0000000000c1', '20202020-0000-4000-8000-000000000004', 100000000, 0, 0, 4000, 40000000, 'in_transit');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select ref from public.trip_map('20202020-0000-4000-8000-0000000000e1')), 'FA-TEST1', 'the sender sees the trip on the map');
select is((select driver_phone from public.trip_map('20202020-0000-4000-8000-0000000000e1')), '+2348035550000', 'and can call the driver during the live trip (D018)');
select is(public.find_trip('20202020-0000-4000-8000-0000000000a1', 'fa-test1'), '20202020-0000-4000-8000-0000000000d1'::uuid, 'Track a trip finds it by reference in their business');
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.trip_map('20202020-0000-4000-8000-0000000000e1')), 0, 'someone else sees nothing');
select is(public.find_trip('20202020-0000-4000-8000-0000000000a1', 'FA-TEST1'), null, 'nor finds it by reference');
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select next_contact_phone from public.trip_map('20202020-0000-4000-8000-0000000000e1')), '+2348039876543', 'the truck side gets the next stop contact during the trip');
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select next_contact_phone from public.trip_map('20202020-0000-4000-8000-0000000000e1')), null, 'the sender does not need it from here');
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select trip_ref from public.fleet('20202020-0000-4000-8000-0000000000b1')), 'FA-TEST1-T1', 'the owner sees the truck on its trip');

select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select is((select held_kobo from public.trip_map('20202020-0000-4000-8000-0000000000e1')), null, 'the driver never sees money (D003)');
select is((select next_contact_phone from public.trip_map('20202020-0000-4000-8000-0000000000e1')), '+2348039876543', 'the driver gets the pickup contact during the trip');
reset role;
update public.organization_members set status = 'suspended' where user_id = '20202020-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select is((select count(*)::int from public.trip_map('20202020-0000-4000-8000-0000000000e1')), 0, 'a removed driver sees nothing, no contacts');
select set_config('request.jwt.claims', '{"sub": "20202020-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.fleet('20202020-0000-4000-8000-0000000000b1')), 0, 'a stranger sees no fleet');
reset role;
select * from finish();
rollback;
