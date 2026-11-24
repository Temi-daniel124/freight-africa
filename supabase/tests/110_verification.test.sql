begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- A sender (owner of Bello Agro), a stranger, and two verification staff.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a1a1a1a1-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aisha@example.com', now(), '{"full_name": "Aisha Bello"}', now(), now()),
  ('a1a1a1a1-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@example.com', now(), '{"full_name": "Segun Ade"}', now(), now()),
  ('a1a1a1a1-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Balogun"}', now(), now()),
  ('a1a1a1a1-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yusuf@freight-africa.com', now(), '{"full_name": "Yusuf Danjuma"}', now(), now());
insert into public.staff_members (user_id, role) values
  ('a1a1a1a1-0000-4000-8000-000000000003', 'verification'),
  ('a1a1a1a1-0000-4000-8000-000000000004', 'finance');
insert into public.organizations (id, kind, name) values ('b2b2b2b2-0000-4000-8000-000000000001', 'shipper', 'Bello Agro Commodities');
insert into public.organization_members (org_id, user_id, shipper_role) values ('b2b2b2b2-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001', 'owner');
insert into storage.objects (bucket_id, name) values
  ('verification', 'a1a1a1a1-0000-4000-8000-000000000001/id-front.jpg'),
  ('verification', 'a1a1a1a1-0000-4000-8000-000000000002/id-front.jpg');

select ok(not public.is_verified_sender('b2b2b2b2-0000-4000-8000-000000000001'), 'a new sender has no badge');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a1a1a1a1-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok($$select public.submit_identity_check('sender', 'nin_slip', 'AISHA BELLO', 'a1a1a1a1-0000-4000-8000-000000000002/id-front.jpg')$$, '42501', null, 'nobody submits someone else''s photo');
select throws_ok($$select public.submit_identity_check('sender', 'nin_slip', 'AISHA BELLO', 'a1a1a1a1-0000-4000-8000-000000000001/missing.jpg')$$, 'P0002', null, 'the photo must be uploaded first');
select set_config('test.s1', public.submit_identity_check('sender', 'nin_slip', 'AISHA BELLO', 'a1a1a1a1-0000-4000-8000-000000000001/id-front.jpg')::text, true);
select is((select status::text from public.verification_sessions where id = current_setting('test.s1')::uuid), 'needs_review', 'the check waits for the verification team');
select is((select kyc_status::text from public.profiles where id = 'a1a1a1a1-0000-4000-8000-000000000001'), 'needs_review', 'and the person shows as waiting');
select throws_ok($$select public.submit_identity_check('sender', 'nin_slip', 'AISHA BELLO', 'a1a1a1a1-0000-4000-8000-000000000001/id-front.jpg')$$, '23505', null, 'one open check at a time');
select throws_ok(format('select public.decide_identity_check(%L, true)', current_setting('test.s1')), '42501', null, 'a sender cannot approve their own check');

-- Privacy: the stranger sees neither the check nor the photo.
select set_config('request.jwt.claims', '{"sub": "a1a1a1a1-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.verification_sessions), 0, 'other people see nobody''s checks');
select is((select count(*)::int from storage.objects where bucket_id = 'verification' and name like 'a1a1a1a1-0000-4000-8000-000000000001/%'), 0, 'or their ID photos');

-- Finance staff can't decide; verification staff can.
select set_config('request.jwt.claims', '{"sub": "a1a1a1a1-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok(format('select public.decide_identity_check(%L, true)', current_setting('test.s1')), '42501', null, 'finance staff do not decide identity checks');
select set_config('request.jwt.claims', '{"sub": "a1a1a1a1-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'verification' and name like 'a1a1a1a1-0000-4000-8000-000000000001/%'), 1, 'verification staff open the photo');
select throws_ok(format('select public.decide_identity_check(%L, false)', current_setting('test.s1')), '22023', null, 'a decline needs a reason');
select lives_ok(format('select public.decide_identity_check(%L, true)', current_setting('test.s1')), 'verification staff approve');
reset role;
select is((select kyc_status::text from public.profiles where id = 'a1a1a1a1-0000-4000-8000-000000000001'), 'approved', 'the person is verified');
select ok(public.is_verified_sender('b2b2b2b2-0000-4000-8000-000000000001'), 'and their business shows the Verified sender badge (D041)');
select is((select count(*)::int from public.notifications where user_id = 'a1a1a1a1-0000-4000-8000-000000000001' and event = 'verification.approved'), 2, 'they are told in the app and by email');

select * from finish();
rollback;
