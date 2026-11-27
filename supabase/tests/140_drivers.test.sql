begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Musa Haulage: Ibrahim (owner); Sani joins as a driver; a stranger; Kemi (verification).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a7a7a7a7-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@example.com', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('a7a7a7a7-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@example.com', now(), '{"full_name": "Sani Abubakar"}', now(), now()),
  ('a7a7a7a7-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@example.com', now(), '{"full_name": "Segun Ade"}', now(), now()),
  ('a7a7a7a7-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Balogun"}', now(), now());
insert into public.staff_members (user_id, role) values ('a7a7a7a7-0000-4000-8000-000000000004', 'verification');
insert into public.organizations (id, kind, name, tier) values ('b8b8b8b8-0000-4000-8000-000000000001', 'transporter', 'Musa Haulage Ltd', 'new');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values
  ('b8b8b8b8-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000001', 'owner', false),
  ('b8b8b8b8-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000002', 'driver', true);
insert into storage.objects (bucket_id, name) values
  ('fleet', 'b8b8b8b8-0000-4000-8000-000000000001/drivers/a7a7a7a7-0000-4000-8000-000000000002/licence.jpg'),
  ('fleet', 'b8b8b8b8-0000-4000-8000-000000000001/truck.jpg');

select is((select status::text from public.drivers where user_id = 'a7a7a7a7-0000-4000-8000-000000000002'), 'pending', 'joining as a driver creates a driver record, waiting for checks');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a7a7a7a7-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.add_driver_licence('b8b8b8b8-0000-4000-8000-000000000001/truck.jpg', current_date + 400)$$, '42501', null, 'a licence must be the driver''s own photo');
select set_config('test.lic', public.add_driver_licence('b8b8b8b8-0000-4000-8000-000000000001/drivers/a7a7a7a7-0000-4000-8000-000000000002/licence.jpg', current_date + 400, 'KAN 12345 AB')::text, true);
select is((select count(*)::int from public.documents), 1, 'the driver sees their own licence');
select set_config('request.jwt.claims', '{"sub": "a7a7a7a7-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.drivers), 0, 'other people don''t see the business''s drivers');
select is((select count(*)::int from public.documents), 0, 'or their licences');

-- Licence approved, identity not yet: still waiting. Then identity approved: active.
select set_config('request.jwt.claims', '{"sub": "a7a7a7a7-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(format('select public.decide_document(%L, true)', current_setting('test.lic')), 'staff approve the licence');
reset role;
select is((select status::text from public.drivers where user_id = 'a7a7a7a7-0000-4000-8000-000000000002'), 'pending', 'a licence alone is not enough');
update public.profiles set kyc_status = 'approved' where id = 'a7a7a7a7-0000-4000-8000-000000000002';
select is((select status::text || ' ' || licence_expires_on::text || ' ' || licence_number from public.drivers where user_id = 'a7a7a7a7-0000-4000-8000-000000000002'), 'active ' || (current_date + 400)::text || ' KAN12345AB', 'identity and licence approved: the driver can drive, with the licence number from the approved paper');

-- The owner pauses and resumes.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a7a7a7a7-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.set_driver_paused('a7a7a7a7-0000-4000-8000-000000000002', true)$$, '42501', null, 'a driver cannot pause themselves');
select set_config('request.jwt.claims', '{"sub": "a7a7a7a7-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select lives_ok($$select public.set_driver_paused('a7a7a7a7-0000-4000-8000-000000000002', true)$$, 'the owner pauses the driver');
reset role;
update public.profiles set kyc_status = 'approved' where id = 'a7a7a7a7-0000-4000-8000-000000000002';
select is((select status::text || ' ' || paused::text from public.drivers where user_id = 'a7a7a7a7-0000-4000-8000-000000000002'), 'active true', 'a paused driver stays paused, apart from any staff suspension');

-- The app-lock PIN (D042): set only by our server (set_app_pin_for, review of #93).
set local role service_role;
select throws_ok($$select public.set_app_pin_for('a7a7a7a7-0000-4000-8000-000000000002', '111111')$$, '22023', null, 'an easy PIN is refused');
select lives_ok($$select public.set_app_pin_for('a7a7a7a7-0000-4000-8000-000000000002', '480259')$$, 'the driver sets a PIN');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', format('{"sub": "a7a7a7a7-0000-4000-8000-000000000002", "role": "authenticated", "amr": [{"method": "otp", "timestamp": %s}]}', extract(epoch from now())::bigint - 60), true);
select is(public.check_app_pin('480259'), 'ok', 'the right PIN opens the app');
select is(public.check_app_pin('000000'), 'wrong', 'a wrong PIN does not');
select is((select public.check_app_pin('000001') || public.check_app_pin('000002') || public.check_app_pin('000003') || public.check_app_pin('000004')), 'wrongwrongwronglocked', 'the fifth wrong PIN locks it');
select is(public.check_app_pin('480259'), 'locked', 'and then even the right one waits for a new sign-in');
select set_config('request.jwt.claims', format('{"sub": "a7a7a7a7-0000-4000-8000-000000000002", "role": "authenticated", "amr": [{"method": "otp", "timestamp": %s}]}', extract(epoch from now())::bigint - 7200), true);
select throws_ok($$select public.set_app_pin('735190')$$, '42501', null, 'the browser cannot set a PIN, even just after signing in');

reset role;
delete from public.organization_members where user_id = 'a7a7a7a7-0000-4000-8000-000000000002';
select is((select count(*)::int from public.drivers where user_id = 'a7a7a7a7-0000-4000-8000-000000000002'), 0, 'a driver who leaves the business is no longer its driver');
-- A staff-suspended driver who leaves and joins again is still suspended.
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('b8b8b8b8-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000002', 'driver', true);
update public.drivers set status = 'suspended' where user_id = 'a7a7a7a7-0000-4000-8000-000000000002';
delete from public.organization_members where user_id = 'a7a7a7a7-0000-4000-8000-000000000002';
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('b8b8b8b8-0000-4000-8000-000000000001', 'a7a7a7a7-0000-4000-8000-000000000002', 'driver', true);
select is((select status::text from public.drivers where user_id = 'a7a7a7a7-0000-4000-8000-000000000002'), 'suspended', 'a staff suspension survives leaving and rejoining');

select * from finish();
rollback;
