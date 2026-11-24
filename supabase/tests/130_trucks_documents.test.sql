begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Musa Haulage: Ibrahim (owner), Sani (driver); a stranger; Kemi (verification staff).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('e5e5e5e5-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@example.com', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('e5e5e5e5-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@example.com', now(), '{"full_name": "Sani Abubakar"}', now(), now()),
  ('e5e5e5e5-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@example.com', now(), '{"full_name": "Segun Ade"}', now(), now()),
  ('e5e5e5e5-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Balogun"}', now(), now());
insert into public.staff_members (user_id, role) values ('e5e5e5e5-0000-4000-8000-000000000004', 'verification');
insert into public.organizations (id, kind, name, tier) values ('f6f6f6f6-0000-4000-8000-000000000001', 'transporter', 'Musa Haulage Ltd', 'new');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values
  ('f6f6f6f6-0000-4000-8000-000000000001', 'e5e5e5e5-0000-4000-8000-000000000001', 'owner', false),
  ('f6f6f6f6-0000-4000-8000-000000000001', 'e5e5e5e5-0000-4000-8000-000000000002', 'driver', true);
insert into storage.objects (bucket_id, name) values
  ('fleet', 'f6f6f6f6-0000-4000-8000-000000000001/back.jpg'),
  ('fleet', 'f6f6f6f6-0000-4000-8000-000000000001/licence.jpg'),
  ('fleet', 'f6f6f6f6-0000-4000-8000-000000000001/roadworthy.jpg'),
  ('fleet', 'f6f6f6f6-0000-4000-8000-000000000001/insurance.jpg'),
  ('fleet', '00000000-0000-4000-8000-000000000009/other.jpg');
select set_config('test.flatbed', (select id::text from public.truck_types where code = 'flatbed_30t'), true);
select set_config('test.lk', (select id::text from public.corridors where slug = 'lagos-kano'), true);

set local role authenticated;
-- A driver can't add trucks (ROLES: manage_trucks is owners and managers).
select set_config('request.jwt.claims', '{"sub": "e5e5e5e5-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok(format('select public.add_truck(%L, %L, %L, 30000, array[%L], array[%L]::uuid[])', 'f6f6f6f6-0000-4000-8000-000000000001', 'LSR 123 XY', current_setting('test.flatbed'), 'f6f6f6f6-0000-4000-8000-000000000001/back.jpg', current_setting('test.lk')),
  '42501', null, 'a driver cannot add a truck');
select set_config('request.jwt.claims', '{"sub": "e5e5e5e5-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok(format('select public.add_truck(%L, %L, %L, 90000, array[%L], array[%L]::uuid[])', 'f6f6f6f6-0000-4000-8000-000000000001', 'LSR 123 XY', current_setting('test.flatbed'), 'f6f6f6f6-0000-4000-8000-000000000001/back.jpg', current_setting('test.lk')),
  '22023', null, 'a capacity outside the truck type is refused');
select throws_ok(format('select public.add_truck(%L, %L, %L, 30000, array[%L], array[%L]::uuid[])', 'f6f6f6f6-0000-4000-8000-000000000001', 'LSR 123 XY', current_setting('test.flatbed'), '00000000-0000-4000-8000-000000000009/other.jpg', current_setting('test.lk')),
  '42501', null, 'a photo from another business is refused');
select set_config('test.truck', public.add_truck('f6f6f6f6-0000-4000-8000-000000000001', 'lsr-123 xy', current_setting('test.flatbed')::uuid, 30000,
  array['f6f6f6f6-0000-4000-8000-000000000001/back.jpg'], array[current_setting('test.lk')::uuid])::text, true);
select is((select plate_number || ' ' || status from public.trucks where id = current_setting('test.truck')::uuid), 'LSR123XY pending_review', 'the plate is tidied and the truck waits to be checked');
select throws_ok(format('select public.add_truck(%L, %L, %L, 30000, array[%L], array[%L]::uuid[])', 'f6f6f6f6-0000-4000-8000-000000000001', 'LSR123XY', current_setting('test.flatbed'), 'f6f6f6f6-0000-4000-8000-000000000001/back.jpg', current_setting('test.lk')),
  '23505', null, 'a plate is on Freight Africa once');
select throws_ok(format('select public.add_truck_document(%L, %L, %L, %L)', current_setting('test.truck'), 'vehicle_licence', 'f6f6f6f6-0000-4000-8000-000000000001/licence.jpg', current_date - 1),
  '22023', null, 'an expired paper is refused');
select set_config('test.d1', public.add_truck_document(current_setting('test.truck')::uuid, 'vehicle_licence', 'f6f6f6f6-0000-4000-8000-000000000001/licence.jpg', current_date + 5)::text, true);
select set_config('test.d2', public.add_truck_document(current_setting('test.truck')::uuid, 'roadworthiness', 'f6f6f6f6-0000-4000-8000-000000000001/roadworthy.jpg', current_date + 200)::text, true);
select set_config('test.d3', public.add_truck_document(current_setting('test.truck')::uuid, 'insurance_third_party', 'f6f6f6f6-0000-4000-8000-000000000001/insurance.jpg', current_date + 300)::text, true);
select throws_ok(format('select public.decide_truck(%L, true)', current_setting('test.truck')), '42501', null, 'an owner cannot approve their own truck');

-- A stranger sees nothing.
select set_config('request.jwt.claims', '{"sub": "e5e5e5e5-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.trucks), 0, 'other people don''t see the business''s trucks');
select is((select count(*)::int from storage.objects where bucket_id = 'fleet'), 0, 'or its photos');

-- Verification staff: truck first, then papers; it goes live with the last paper.
select set_config('request.jwt.claims', '{"sub": "e5e5e5e5-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(format('select public.decide_truck(%L, true)', current_setting('test.truck')), 'staff approve the truck');
select is((select status::text from public.trucks where id = current_setting('test.truck')::uuid), 'pending_review', 'it waits for its papers');
select throws_ok(format('select public.decide_document(%L, false)', current_setting('test.d1')), '22023', null, 'a rejected paper needs a reason');
select lives_ok(format('select public.decide_document(%L, true)', current_setting('test.d1')), 'staff approve the licence');
select lives_ok(format('select public.decide_document(%L, true)', current_setting('test.d2')), 'and the road-worthiness certificate');
select lives_ok(format('select public.decide_document(%L, true)', current_setting('test.d3')), 'and the insurance');
reset role;
select is((select status::text from public.trucks where id = current_setting('test.truck')::uuid), 'active', 'with all three papers the truck is active');

-- The morning check: the licence expires in 5 days, so a 7-day reminder goes out once.
select private.daily_document_checks();
select private.daily_document_checks();
select is((select count(*)::int from public.notifications where event = 'document.expiring' and user_id = 'e5e5e5e5-0000-4000-8000-000000000001'), 2,
  'the owner is reminded once, in the app and by email');

select * from finish();
rollback;
