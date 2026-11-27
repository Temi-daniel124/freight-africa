begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Musa Haulage (owner Musa, drivers Sani and Bello) has a trip assigned to Sani; Emeka's owner is a stranger.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('33033033-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@musahaulage.ng', now(), '{"full_name": "Musa Danladi"}', now(), now()),
  ('33033033-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@musahaulage.ng', now(), '{"full_name": "Sani Bello"}', now(), now()),
  ('33033033-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bello@musahaulage.ng', now(), '{"full_name": "Bello Yusuf"}', now(), now()),
  ('33033033-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emeka@emeka.ng', now(), '{"full_name": "Emeka Obi"}', now(), now()),
  ('33033033-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ada@adastores.ng', now(), '{"full_name": "Ada Eze"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('33033033-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'gold'),
  ('33033033-0000-4000-8000-0000000000b2', 'transporter', 'Emeka Transport', 'new'),
  ('33033033-0000-4000-8000-0000000000a1', 'shipper', 'Ada Stores', null);
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('33033033-0000-4000-8000-0000000000b1', '33033033-0000-4000-8000-000000000001', null, 'owner', false),
  ('33033033-0000-4000-8000-0000000000b1', '33033033-0000-4000-8000-000000000002', null, 'driver', true),
  ('33033033-0000-4000-8000-0000000000b1', '33033033-0000-4000-8000-000000000003', null, 'driver', true),
  ('33033033-0000-4000-8000-0000000000b2', '33033033-0000-4000-8000-000000000004', null, 'owner', false),
  ('33033033-0000-4000-8000-0000000000a1', '33033033-0000-4000-8000-000000000005', 'owner', null, false);
insert into public.drivers (user_id, org_id, status) values
  ('33033033-0000-4000-8000-000000000002', '33033033-0000-4000-8000-0000000000b1', 'active'),
  ('33033033-0000-4000-8000-000000000003', '33033033-0000-4000-8000-0000000000b1', 'active')
on conflict (user_id) do update set org_id = excluded.org_id, status = 'active';

insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status, approved_at) values
  ('33033033-0000-4000-8000-0000000000c1', '33033033-0000-4000-8000-0000000000b1', 'KAN330XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'active', now());
insert into public.loads (id, ref, shipper_org_id, from_city_id, to_city_id, goods_category_id, truck_type_id, pickup_from, pickup_until, freight_kobo, fee_bps, fee_kobo, total_kobo, status)
values ('33033033-0000-4000-8000-0000000000d1', 'FA-33033', '33033033-0000-4000-8000-0000000000a1', (select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano'),
  (select id from public.goods_categories where code = 'rice_bags'), (select id from public.truck_types where code = 'flatbed_30t'), now() + interval '1 day', now() + interval '1 day 6 hours', 100000000, 300, 3000000, 103000000, 'matched');
insert into public.trips (id, ref, load_id, transporter_org_id, truck_id, driver_id, freight_kobo, commission_bps, commission_kobo, advance_bps, advance_kobo, status)
values ('33033033-0000-4000-8000-0000000000e1', 'FA-33033-T1', '33033033-0000-4000-8000-0000000000d1', '33033033-0000-4000-8000-0000000000b1', '33033033-0000-4000-8000-0000000000c1',
  '33033033-0000-4000-8000-000000000002', 100000000, 400, 4000000, 5000, 50000000, 'assigned');

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('33033033-0000-4000-8000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Ogunleye"}', now(), now()),
  ('33033033-0000-4000-8000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'halima@freight-africa.com', now(), '{"full_name": "Halima Musa"}', now(), now());
insert into public.staff_members (user_id, role) values
  ('33033033-0000-4000-8000-0000000000f1', 'operations'),
  ('33033033-0000-4000-8000-0000000000f2', 'verification');

set local role authenticated;
-- Operations without two-step sign-in, verification staff and the owner are all refused.
select set_config('request.jwt.claims', '{"sub": "33033033-0000-4000-8000-0000000000f1", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok($$select public.staff_trip_action('33033033-0000-4000-8000-0000000000e1', 'delivered', 'Receiver confirmed by phone')$$, '42501', null, 'not without two-step sign-in');
select set_config('request.jwt.claims', '{"sub": "33033033-0000-4000-8000-0000000000f2", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.staff_trip_action('33033033-0000-4000-8000-0000000000e1', 'delivered', 'Receiver confirmed by phone')$$, '42501', null, 'verification staff cannot move a trip');
select set_config('request.jwt.claims', '{"sub": "33033033-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.staff_trip_action('33033033-0000-4000-8000-0000000000e1', 'delivered', 'Receiver confirmed by phone')$$, '42501', null, 'nor can the owner');
-- Operations: a reason is required, and the step must be a known one.
select set_config('request.jwt.claims', '{"sub": "33033033-0000-4000-8000-0000000000f1", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.staff_trip_action('33033033-0000-4000-8000-0000000000e1', 'delivered', 'ok')$$, '22023', null, 'a reason is required');
select throws_ok($$select public.staff_trip_action('33033033-0000-4000-8000-0000000000e1', 'cancel', 'Sender asked to cancel')$$, '22023', null, 'only loaded, delivered or release');
-- Notes go on the trip's activity.
select lives_ok($$select public.staff_trip_note('33033033-0000-4000-8000-0000000000e1', 'Called Musa: truck leaves at 6 am')$$, 'operations adds a note');
select set_config('request.jwt.claims', '{"sub": "33033033-0000-4000-8000-0000000000f2", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.staff_trip_note('33033033-0000-4000-8000-0000000000e1', 'A note')$$, '42501', null, 'verification staff cannot add trip notes');
reset role;
select is((select payload ->> 'note' from public.trip_events where trip_id = '33033033-0000-4000-8000-0000000000e1' and type = 'staff.note'), 'Called Musa: truck leaves at 6 am', 'the note is on the trip');

select * from finish();
rollback;
