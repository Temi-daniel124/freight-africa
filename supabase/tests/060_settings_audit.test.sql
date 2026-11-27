begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

-- Two super admins (two-person approval needs both), finance staff, and an ordinary user.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('eeeeeeee-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ifeoma@freight-africa.com', now(), '{"full_name": "Ifeoma Nwosu"}', now(), now()),
  ('eeeeeeee-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dayo@freight-africa.com', now(), '{"full_name": "Dayo Bello"}', now(), now()),
  ('eeeeeeee-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@freight-africa.com', now(), '{"full_name": "Segun Ade"}', now(), now()),
  ('eeeeeeee-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bola@example.com', now(), '{"full_name": "Bola Ojo"}', now(), now());
insert into public.staff_members (user_id, role) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'super_admin'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'super_admin'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'finance');

-- SYSTEM-LOGIC §11: every value is there with its default.
select is((select count(*)::int from public.settings), 62, 'all 62 settings are seeded (D037 dispute settings, D039 demo_identity_checks, D044 app_lock_minutes, Phase 3 fees, D047 offers)');
select is((select value from public.settings where key = 'advance_bps'), '{"new": 3000, "established": 4000, "gold": 5000}'::jsonb, 'advance rates by tier');
select is((select value from public.settings where key = 'payout_two_person_kobo'), '500000000'::jsonb, 'payouts above ₦5m need two people');
select is((select value from public.settings where key = 'agents_enabled'), 'true'::jsonb, 'agents are on');
select is((select count(*)::int from public.settings where is_money), 24, 'twenty-four money settings need a second approval (D037)');
select throws_ok($$insert into public.approvals (kind, subject_id, payload, requested_by, approved_by) values ('setting_change', 'x', '{}', 'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001')$$, '23514', null, 'nobody approves their own request');

-- Reading.
set local role anon;
select is(public.public_setting('agents_enabled'), 'true'::jsonb, 'the app can read whether agents are on, before sign-in');
select ok(public.public_setting('advance_bps') is null, 'but not money settings');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.settings), 0, 'an ordinary user reads no settings');
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*)::int from public.settings), 62, 'staff read them all');

-- Changing (X-21): super admins only, never directly.
select throws_ok($$select public.change_setting('max_dropoffs', '5')$$, '42501', null, 'finance cannot change settings');
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$update public.settings set value = '5' where key = 'max_dropoffs'$$, '42501', null, 'settings cannot be updated directly');
select ok(public.change_setting('max_dropoffs', '5', 'Trial with five drops') is null, 'a super admin changes an ordinary setting at once');
select is((select value from public.settings where key = 'max_dropoffs'), '5'::jsonb, 'and it is saved');
select throws_ok($$select public.change_setting('max_dropoffs', '"five"')$$, '22023', null, 'a value of the wrong kind is refused');
select throws_ok($$select public.change_setting('advance_bps', '{"new": 3500}')$$, '22023', null, 'an object must keep all its keys');
select throws_ok($$select public.change_setting('cancellation_fee_kobo', '-1')$$, '22023', null, 'kobo cannot be negative');
select throws_ok($$select public.change_setting('advance_bps', '{"new": 3000, "established": 4000, "gold": 12000}')$$, '22023', null, 'a rate cannot be above 100%');

-- Money settings need a second super admin (ROLES §8).
select set_config('test.approval', public.change_setting('cancellation_fee_kobo', '3000000', 'Raise to ₦30,000')::text, true);
select is((select value from public.settings where key = 'cancellation_fee_kobo'), '2500000'::jsonb, 'a money setting does not change on request');
select throws_ok(format('select public.decide_approval(%L, true)', current_setting('test.approval')), '42501', null, 'the person who asked cannot approve it');
select throws_ok($$select public.change_setting('cancellation_fee_kobo', '3500000')$$, '23505', null, 'a second change cannot be queued while one is waiting');
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal2"}', true);
select lives_ok(format('select public.decide_approval(%L, true)', current_setting('test.approval')), 'a second super admin approves');
select is((select value from public.settings where key = 'cancellation_fee_kobo'), '3000000'::jsonb, 'and only then the fee changes');
select throws_ok(format('select public.decide_approval(%L, false)', current_setting('test.approval')), 'P0002', null, 'a decided approval cannot be decided again');

-- The audit log (DATA-MODEL §11): every change, who made it, append-only, super admins only.
select is(
  (select actor_role || ' ' || action || ' ' || (old ->> 'value') || '→' || (new ->> 'value') from public.audit_log where table_name = 'settings' and row_id = 'cancellation_fee_kobo' order by id desc limit 1),
  'staff:super_admin update 2500000→3000000',
  'the fee change is logged with who made it and the before and after'
);
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*)::int from public.audit_log), 0, 'finance cannot read the audit log');

reset role;
select throws_ok($$update public.audit_log set action = 'nothing'$$, '42501', null, 'the audit log refuses edits');

select * from finish();
rollback;
