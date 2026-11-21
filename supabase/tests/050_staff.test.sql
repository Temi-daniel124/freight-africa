begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- A super admin, a finance staff member, an ordinary user who owns a business, and two people who will be
-- invited as staff (one with the right email, one without).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('cccccccc-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ifeoma@freight-africa.com', now(), '{"full_name": "Ifeoma Nwosu"}', now(), now()),
  ('cccccccc-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@freight-africa.com', now(), '{"full_name": "Segun Ade"}', now(), now()),
  ('cccccccc-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bola@example.com', now(), '{"full_name": "Bola Ojo"}', now(), now()),
  ('cccccccc-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Ola"}', now(), now()),
  ('cccccccc-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tayo@example.com', now(), '{"full_name": "Tayo Ibe"}', now(), now());

insert into public.staff_members (user_id, role) values
  ('cccccccc-0000-4000-8000-000000000001', 'super_admin'),
  ('cccccccc-0000-4000-8000-000000000002', 'finance');

insert into public.organizations (id, kind, name) values ('dddddddd-0000-4000-8000-000000000001', 'shipper', 'Ojo Stores');
insert into public.organization_members (org_id, user_id, shipper_role) values ('dddddddd-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000003', 'owner');

select throws_ok(
  $$insert into public.invites (kind, org_id, email, role_payload, token_hash) values ('staff', 'dddddddd-0000-4000-8000-000000000001', 'x@example.com', '{"staff_role": "support"}', repeat('a', 64))$$,
  '23514', null, 'a staff invite never belongs to an organisation'
);

set local role authenticated;

-- is_staff counts only a session that has passed two-step sign-in (SECURITY.md §3).
select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal1"}', true);
select is(public.is_staff(), false, 'a staff member with only the first step is not treated as staff');
select is(public.my_staff_role()::text, 'super_admin', 'but the console can see which role to set up');
select is((select count(*)::int from public.organizations), 0, 'and reads no one''s data yet');
select throws_ok($$select public.create_staff_invite('kemi@freight-africa.com', 'operations')$$, '42501', null, 'nor invite staff');
select throws_ok($$select public.new_staff_backup_codes()$$, '42501', null, 'nor make backup codes');

select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select is(public.is_staff(), true, 'after two-step sign-in, the super admin is staff');
select is(public.is_staff('finance'), false, 'with their own role only');
select is((select count(*)::int from public.organizations), 1, 'staff read every organisation (ROLES §7)');
select is((select count(*)::int from public.profiles where email = 'bola@example.com'), 1, 'and people''s profiles (ROLES §6: staff see everyone)');
select throws_ok($$insert into public.staff_members (user_id, role) values ('cccccccc-0000-4000-8000-000000000003', 'super_admin')$$, '42501', null, 'nobody adds staff directly');

-- Invites (X-24): super admins only.
select is(char_length(set_config('test.token', public.create_staff_invite(' Kemi@Freight-Africa.com ', 'operations'), true)), 32, 'a super admin invites a staff member');

select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal2"}', true);
select throws_ok($$select public.create_staff_invite('tayo@example.com', 'support')$$, '42501', null, 'finance cannot invite staff');

select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2"}', true);
select is(public.is_staff(), false, 'an ordinary user is never staff, even with two-step sign-in');
select is((select count(*)::int from public.invites where kind = 'staff'), 0, 'and cannot see staff invites');

reset role;
select ok((select expires_at between now() + interval '47 hours' and now() + interval '49 hours' from public.invites where kind = 'staff'), 'a staff invite lasts 48 hours');
select is((select token_hash from public.invites where kind = 'staff'), encode(extensions.digest(current_setting('test.token'), 'sha256'), 'hex'), 'only the token''s hash is stored');
set local role anon;
select is((select role::text || ' · ' || state from public.staff_invite_details(current_setting('test.token'))), 'operations · open', 'the invite page shows the role before sign-in');
reset role;

-- Accepting (X-00): only the confirmed email the invite went to, only once.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000005", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(format('select public.accept_staff_invite(%L)', current_setting('test.token')), '42501', null, 'someone else cannot use a staff invite');
reset role;
update auth.users set email_confirmed_at = null where id = 'cccccccc-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok(format('select public.accept_staff_invite(%L)', current_setting('test.token')), '42501', null, 'an unconfirmed email does not count');
reset role;
update auth.users set email_confirmed_at = now() where id = 'cccccccc-0000-4000-8000-000000000004';
set local role authenticated;
select is(public.accept_staff_invite(current_setting('test.token'))::text, 'operations', 'the invited person becomes operations staff');
select throws_ok(format('select public.accept_staff_invite(%L)', current_setting('test.token')), 'P0002', null, 'the invite cannot be used twice');
select is(public.is_staff(), false, 'and is still not staff until two-step sign-in is set up');

-- Backup codes (X-00 step 3).
select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal2"}', true);
select set_config('test.codes', array_to_string(public.new_staff_backup_codes(), ','), true);
select is(array_length(string_to_array(current_setting('test.codes'), ','), 1), 10, 'ten codes are made after two-step sign-in');
select ok(current_setting('test.codes') ~ '^(([2-9A-HJKMNP-Z]{4}-){3}[2-9A-HJKMNP-Z]{4},){9}([2-9A-HJKMNP-Z]{4}-){3}[2-9A-HJKMNP-Z]{4}$', 'sixteen characters, shown as XXXX-XXXX-XXXX-XXXX, without look-alike letters');
select is(public.staff_backup_codes_left(), 10, 'ten are left');
select throws_ok($$select * from private.staff_backup_codes$$, '42501', null, 'the stored codes are not readable');

select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal1"}', true);
select is(public.use_staff_backup_code(lower(split_part(current_setting('test.codes'), ',', 3))), true, 'a backup code works from the first-step session, typed in any case');
select is(public.use_staff_backup_code(split_part(current_setting('test.codes'), ',', 3)), false, 'but only once');

select set_config('request.jwt.claims', '{"sub": "cccccccc-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select throws_ok($$select public.use_staff_backup_code('AAAA-BBBB-CCCC-DDDD')$$, '42501', null, 'backup codes are only for staff');

select * from finish();
rollback;
