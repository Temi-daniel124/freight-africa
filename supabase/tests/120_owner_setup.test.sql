begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Musa Haulage: Ibrahim (owner), Bola (manager); and a stranger.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('c3c3c3c3-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@example.com', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('c3c3c3c3-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bola@example.com', now(), '{"full_name": "Bola Ojo"}', now(), now()),
  ('c3c3c3c3-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@example.com', now(), '{"full_name": "Segun Ade"}', now(), now());
insert into public.organizations (id, kind, name, tier) values ('d4d4d4d4-0000-4000-8000-000000000001', 'transporter', 'Musa Haulage Ltd', 'new');
insert into public.organization_members (org_id, user_id, transporter_role) values
  ('d4d4d4d4-0000-4000-8000-000000000001', 'c3c3c3c3-0000-4000-8000-000000000001', 'owner'),
  ('d4d4d4d4-0000-4000-8000-000000000001', 'c3c3c3c3-0000-4000-8000-000000000002', 'manager');

select set_config('test.kano', (select id::text from public.cities where slug = 'kano'), true);
select set_config('test.lk', (select id::text from public.corridors where slug = 'lagos-kano'), true);

-- T-ON-02: base, routes and "Do you drive?".
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "c3c3c3c3-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok(format('select public.save_transporter_profile(%L, %L, array[%L]::uuid[], false)', 'd4d4d4d4-0000-4000-8000-000000000001', current_setting('test.kano'), current_setting('test.lk')),
  '42501', null, 'a manager does not change the business profile');
select set_config('request.jwt.claims', '{"sub": "c3c3c3c3-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok(format('select public.save_transporter_profile(%L, %L, %L::uuid[], false)', 'd4d4d4d4-0000-4000-8000-000000000001', current_setting('test.kano'), '{}'),
  '22023', null, 'at least one route is needed');
select lives_ok(format('select public.save_transporter_profile(%L, %L, array[%L]::uuid[], true)', 'd4d4d4d4-0000-4000-8000-000000000001', current_setting('test.kano'), current_setting('test.lk')),
  'the owner saves base, routes and that they drive');
reset role;
select is((select corridor_ids from public.organizations where id = 'd4d4d4d4-0000-4000-8000-000000000001'), array[current_setting('test.lk')::uuid], 'the routes are saved');
select ok((select is_driver from public.organization_members where user_id = 'c3c3c3c3-0000-4000-8000-000000000001'), 'and the owner is now an owner-driver (D003)');

-- T-ON-04: bank accounts are added only by the server after the name lookup.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "c3c3c3c3-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.add_bank_account('c3c3c3c3-0000-4000-8000-000000000001', 'd4d4d4d4-0000-4000-8000-000000000001', '058', 'GTBank', '0123456789', 'IBRAHIM MUSA', 100)$$,
  '42501', null, 'people cannot add a bank account with a name they typed');
reset role;
set local role service_role;
select throws_ok($$select public.add_bank_account('c3c3c3c3-0000-4000-8000-000000000002', 'd4d4d4d4-0000-4000-8000-000000000001', '058', 'GTBank', '0123456789', 'BOLA OJO', 100)$$,
  '42501', null, 'only an owner''s account can be added');
select set_config('test.b1', public.add_bank_account('c3c3c3c3-0000-4000-8000-000000000001', 'd4d4d4d4-0000-4000-8000-000000000001', '058', 'GTBank', '0123456789', 'Ibrahim Musa', 100)::text, true);
reset role;
select is((select account_last4 || ' ' || status || ' ' || resolved_name from public.bank_accounts where id = current_setting('test.b1')::uuid), '6789 pending_hold IBRAHIM MUSA', 'saved with the last four digits, on a 24-hour hold');
select ok((select usable_from > now() + interval '23 hours' from public.bank_accounts where id = current_setting('test.b1')::uuid), 'usable after 24 hours (SYSTEM-LOGIC §10)');
select is((select extensions.pgp_sym_decrypt(account_number_enc, private.bank_key()) from public.bank_accounts where id = current_setting('test.b1')::uuid), '0123456789', 'the number is encrypted and opens only with the Vault key');
select ok((select new ? 'account_number_enc' from public.audit_log where table_name = 'bank_accounts' order by id desc limit 1) is false, 'the audit log never holds the number');

-- A change replaces the old account and tells the owner; a poor name match waits for staff.
set local role service_role;
select set_config('test.b2', public.add_bank_account('c3c3c3c3-0000-4000-8000-000000000001', 'd4d4d4d4-0000-4000-8000-000000000001', '044', 'Access Bank', '9876543210', 'MUSA TRADING ENT', 55)::text, true);
reset role;
select is((select status from public.bank_accounts where id = current_setting('test.b2')::uuid), 'needs_review', 'a name that doesn''t match waits for staff');
select is((select status from public.bank_accounts where id = current_setting('test.b1')::uuid), 'disabled', 'the old account stops receiving payouts');
select is((select count(*)::int from public.notifications where user_id = 'c3c3c3c3-0000-4000-8000-000000000001' and event = 'bank_account.changed'), 2, 'the owner is told in the app and by email');

-- Who sees the accounts: the owner, never the manager or a stranger, and never the number.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "c3c3c3c3-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.bank_accounts), 0, 'a manager does not see the bank accounts');
select set_config('request.jwt.claims', '{"sub": "c3c3c3c3-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select account_number_enc from public.bank_accounts$$, '42501', null, 'even the owner cannot read the encrypted number');

select * from finish();
rollback;
