begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

insert into auth.users (id, instance_id, aud, role, email, phone, phone_confirmed_at, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('18181818-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', null, null, now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('18181818-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p-18181818000040008000000000000002@phone.freight-africa.com', '2348031234567', now(), now(), '{"full_name": "Musa Bello"}', now(), now()),
  ('18181818-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emeka@nwosuhaulage.ng', null, null, now(), '{"full_name": "Emeka Nwosu"}', now(), now()),
  ('18181818-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tola@example.com', null, null, now(), '{"full_name": "Tola Ade"}', now(), now());

-- ---- Obvious PINs are refused ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "18181818-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.set_app_pin('000000')$$, '22023', null, 'repeated digits are refused');
select throws_ok($$select public.set_app_pin('123456')$$, '22023', null, 'a run up is refused');
select throws_ok($$select public.set_app_pin('987654')$$, '22023', null, 'a run down is refused');
select throws_ok($$select public.set_app_pin('121212')$$, '22023', null, 'a repeated pair is refused');
select throws_ok($$select public.set_app_pin('123123')$$, '22023', null, 'a repeated triple is refused');
select throws_ok($$select public.set_app_pin('12345')$$, '22023', null, 'five digits are refused');
select lives_ok($$select public.set_app_pin('480157')$$, 'a good PIN is saved');
select is(public.has_app_pin(), true, 'the person now has a PIN');

-- ---- Only our server checks PINs for sign-in -----------------------------------------------------
select throws_ok($$select public.pin_sign_in('adaeze@okaforfoods.ng', '480157', 'ip-x')$$, '42501', null, 'the browser can never try PINs (no public PIN endpoint)');
select throws_ok($$select public.lock_account('18181818-0000-4000-8000-000000000001')$$, '42501', null, 'nor lock accounts');
reset role;

set local role service_role;
select is(public.pin_sign_in('Adaeze@OkaforFoods.ng', '480157', 'ip-a') ->> 'status', 'ok', 'email (any case) and the right PIN sign in');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '480157', 'ip-a') ->> 'email', 'adaeze@okaforfoods.ng', 'and the server learns which account to open');
select is(public.pin_sign_in('nobody@example.com', '480157', 'ip-a') ->> 'status', 'none', 'an unknown account answers none');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '111999', 'ip-a') ->> 'left', '4', 'a wrong PIN counts down');
select is(public.pin_ip_failures('ip-a'), 2, 'wrong tries are counted per internet address (unknown account included)');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '111999', 'ip-b') ->> 'status', 'wrong', 'second wrong try');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '111999', 'ip-b') ->> 'status', 'wrong', 'third');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '111999', 'ip-b') ->> 'status', 'wrong', 'fourth');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '111999', 'ip-b') ->> 'just_locked', 'true', 'the fifth wrong PIN locks PIN sign-in, and says so once');
select is(public.pin_sign_in('adaeze@okaforfoods.ng', '480157', 'ip-c') ->> 'status', 'locked', 'even the right PIN is refused once locked');

-- Twenty wrong tries from one address in 15 minutes stop that address.
insert into private.pin_attempts (ip_key) select 'ip-z' from generate_series(1, 20);
select is(public.pin_sign_in('emeka@nwosuhaulage.ng', '480157', 'ip-z') ->> 'status', 'limited', 'too many wrong PINs from one address');

-- Phone accounts sign in with the number and PIN.
insert into private.app_pins (user_id, pin_hash) values ('18181818-0000-4000-8000-000000000002', extensions.crypt('730264', extensions.gen_salt('bf', 4)));
select is(public.pin_sign_in('2348031234567', '730264', 'ip-d') ->> 'status', 'ok', 'a phone-invited driver signs in with phone number and PIN');

-- ---- Devices -------------------------------------------------------------------------------------
select is(public.record_device('18181818-0000-4000-8000-000000000003', repeat('a', 64), 'Chrome on Android', 'Lagos'), false, 'the first device ever is not a "new sign-in"');
select is(public.record_device('18181818-0000-4000-8000-000000000003', repeat('a', 64), 'Chrome on Android', 'Lagos'), false, 'the same device again is not new');
select is(public.record_device('18181818-0000-4000-8000-000000000003', repeat('b', 64), 'Safari on iPhone', 'Abuja'), true, 'another device is new (the server emails the person)');

-- ---- Lock your account ---------------------------------------------------------------------------
select lives_ok($$select public.lock_account('18181818-0000-4000-8000-000000000001')$$, 'the emailed link locks the account');
reset role;
select is((select count(*)::int from private.app_pins where user_id = '18181818-0000-4000-8000-000000000001'), 0, 'its PIN is removed, so only an email code signs in');

-- ---- PIN reset links (phone accounts only) -------------------------------------------------------
insert into public.organizations (id, kind, name) values ('18181818-0000-4000-8000-0000000000aa', 'transporter', 'Nwosu Haulage');
insert into public.organization_members (org_id, user_id, transporter_role) values ('18181818-0000-4000-8000-0000000000aa', '18181818-0000-4000-8000-000000000003', 'owner');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('18181818-0000-4000-8000-0000000000aa', '18181818-0000-4000-8000-000000000002', 'driver', true);
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('18181818-0000-4000-8000-0000000000aa', '18181818-0000-4000-8000-000000000004', 'driver', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "18181818-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select throws_ok($$select public.create_pin_reset_link('18181818-0000-4000-8000-0000000000aa', '18181818-0000-4000-8000-000000000004', repeat('c', 64))$$, '42501', null, 'never for someone with their own email (no account takeover)');
select lives_ok($$select public.create_pin_reset_link('18181818-0000-4000-8000-0000000000aa', '18181818-0000-4000-8000-000000000002', repeat('d', 64))$$, 'the owner makes a new PIN link for a driver invited by phone');
-- A driver who also belongs to another business can't be reset by this owner (no cross-business takeover).
reset role;
insert into public.organizations (id, kind, name) values ('18181818-0000-4000-8000-0000000000bb', 'transporter', 'Bello Logistics');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('18181818-0000-4000-8000-0000000000bb', '18181818-0000-4000-8000-000000000002', 'driver', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "18181818-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select throws_ok($$select public.create_pin_reset_link('18181818-0000-4000-8000-0000000000aa', '18181818-0000-4000-8000-000000000002', repeat('e', 64))$$, '42501', null, 'never for someone who belongs to another business too');
reset role;
delete from public.organization_members where org_id = '18181818-0000-4000-8000-0000000000bb';
set local role service_role;
select is((select user_id from public.peek_pin_reset_account(repeat('d', 64))), '18181818-0000-4000-8000-000000000002'::uuid, 'the link is for that driver');
select is(public.use_pin_reset_link(repeat('d', 64), gen_random_uuid()), true, 'it is spent once the new PIN is set');
select is(public.use_pin_reset_link(repeat('d', 64), gen_random_uuid()), false, 'and never works again');
reset role;

-- ---- Phone accounts never show their internal address -----------------------------------------
select is((select email from public.profiles where id = '18181818-0000-4000-8000-000000000002'), null, 'a phone account''s profile has no email (the internal address stays hidden)');

-- ---- Change PIN with the current PIN -----------------------------------------------------------
insert into private.app_pins (user_id, pin_hash) values ('18181818-0000-4000-8000-000000000003', extensions.crypt('480157', extensions.gen_salt('bf', 4)));
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "18181818-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is(public.change_app_pin('999999', '730264'), 'wrong', 'a wrong current PIN is refused (and counted)');
select is(public.change_app_pin('480157', '123456'), 'weak', 'an obvious new PIN is refused');
select is(public.change_app_pin('480157', '730264'), 'ok', 'the current PIN changes it');
reset role;

select * from finish();
rollback;
