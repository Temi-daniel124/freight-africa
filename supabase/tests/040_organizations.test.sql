begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

-- The one-owner rule is checked at the end of each statement here (it is deferred to commit in the app),
-- so the tests can see it refuse.
set constraints all immediate;

-- People: a shipper business with every sub-role, a transporter with every sub-role, an owner who
-- drives, someone with no organisation, and someone who will be invited.
insert into auth.users (id, instance_id, aud, role, email, phone, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', null, '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tunde@okaforfoods.ng', null, '{"full_name": "Tunde Bakare"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chioma@okaforfoods.ng', null, '{"full_name": "Chioma Eze"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'femi@okaforfoods.ng', null, '{"full_name": "Femi Adeyemi"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@okaforfoods.ng', null, '{"full_name": "Kemi Lawal"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '2348031110001', '{"full_name": "Musa Ibrahim"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '2348031110002', '{"full_name": "Aliyu Sani"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '2348031110003', '{"full_name": "Garba Usman"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '2348031110004', '{"full_name": "Bello Danjuma"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000021', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ngozi@example.com', null, '{"full_name": "Ngozi Obi"}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000022', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yemi@example.com', '2348031110009', '{"full_name": "Yemi Alade"}', now(), now());

insert into public.organizations (id, kind, name) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'shipper', 'Okafor Foods Ltd'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'transporter', 'Musa Transport'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'transporter', 'Bello Haulage');

insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'owner', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'admin', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'booker', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 'finance', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005', 'viewer', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000011', null, 'owner', false),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000012', null, 'manager', false),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000013', null, 'driver', true),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000014', null, 'owner', true);

-- Structure the database itself refuses.
select throws_ok(
  $$insert into public.organization_members (org_id, user_id, shipper_role) values ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000021', 'booker')$$,
  '23514', null, 'a shipper role cannot be given in a transporter organisation'
);
select throws_ok(
  $$insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000021', 'driver', false)$$,
  '23514', null, 'a driver member is always marked as a driver'
);

-- ROLES-AND-PERMISSIONS §2 and §3: each role's exact set of actions, so every row is tested allowed and
-- denied at once. Rows for tables that don't exist yet (bookings, trucks, payouts) use these same checks.
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000001'),
  array['book', 'cancel_any_booking', 'cancel_own_booking', 'decide_offers', 'edit_business', 'manage_team', 'pay', 'report_and_rate', 'see_codes', 'see_money', 'see_trip_phones', 'view_business', 'view_trips'],
  '§2 shipper owner: everything');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000001'),
  array['book', 'cancel_any_booking', 'cancel_own_booking', 'decide_offers', 'edit_business', 'manage_team', 'pay', 'report_and_rate', 'see_codes', 'see_money', 'see_trip_phones', 'view_business', 'view_trips'],
  '§2 shipper admin: everything (removing the owner is refused separately)');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000001'),
  array['book', 'cancel_own_booking', 'decide_offers', 'pay', 'report_and_rate', 'see_codes', 'see_trip_phones', 'view_business', 'view_trips'],
  '§2 booker: books, pays, decides, cancels own bookings, codes, phones, reports; no money pages, team or business profile');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000001'),
  array['pay', 'see_money', 'view_business', 'view_trips'],
  '§2 finance: pays and sees money pages; cannot book, cancel, see codes or phones');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000001'),
  array['view_business', 'view_trips'],
  '§2 viewer: views trips only');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000011", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000002'),
  array['assign', 'bank_account', 'edit_business', 'load_board', 'manage_drivers', 'manage_managers', 'manage_trucks', 'rate_sender', 'respond_disputes', 'see_money', 'view_business', 'view_trips'],
  '§3 transporter owner: everything but the driver screens; never the codes');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000002'),
  array['assign', 'load_board', 'manage_drivers', 'manage_trucks', 'rate_sender', 'respond_disputes', 'see_money', 'view_business', 'view_trips'],
  '§3 manager: no bank account, no managers, business details view only');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000002'),
  array['confirm_trip', 'own_licence', 'run_trip', 'suggest_load', 'view_trips'],
  '§3 driver: runs and confirms own trips, own licence, suggests return loads; never money (D003)');
select is(public.can_in_org('bbbbbbbb-0000-4000-8000-000000000002', 'see_money'), false, '§3 a driver never sees freight, payouts or earnings');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000014", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000003'),
  array['assign', 'bank_account', 'confirm_trip', 'edit_business', 'load_board', 'manage_drivers', 'manage_managers', 'manage_trucks', 'own_licence', 'rate_sender', 'respond_disputes', 'run_trip', 'see_money', 'view_business', 'view_trips'],
  '§3 owner-driver: owner rights plus the driver screens (runs and confirms own trips)');
select is(public.can_in_org('bbbbbbbb-0000-4000-8000-000000000003', 'see_codes'), false, '§3 nobody on the transporter side sees loading or delivery codes');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}', true);
select is(public.org_permissions('bbbbbbbb-0000-4000-8000-000000000001'), '{}'::text[], 'someone outside the organisation can do nothing in it');
select is(public.member_role('bbbbbbbb-0000-4000-8000-000000000001'), null, 'and has no role there');

-- RLS: members read their own organisation and its members; nobody else does; nobody writes directly.
select is((select count(*)::int from public.organizations), 0, 'an outsider sees no organisations');
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000002', 'booker', null, 'x@example.com')$$, '42501', null, 'an outsider cannot invite, and learns nothing about the organisation');
select is((select count(*)::int from public.organization_members), 0, 'and no members');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select array_agg(name) from public.organizations), array['Okafor Foods Ltd'], 'the shipper owner sees only her own organisation');
select is((select count(*)::int from public.organization_members), 5, 'and its five members');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select is((select count(*)::int from public.organization_members), 3, 'a driver sees the people in his own transporter');

select throws_ok($$insert into public.organizations (kind, name) values ('shipper', 'Fake Ltd')$$, '42501', null, 'organisations cannot be inserted directly');
select throws_ok($$select blocked_reason from public.organizations$$, '42501', null, 'the internal blocked reason is not readable by members');
select throws_ok($$update public.organization_members set transporter_role = 'owner'$$, '42501', null, 'a driver cannot make himself owner');
select throws_ok($$update public.profiles set last_active_org_id = 'bbbbbbbb-0000-4000-8000-000000000001'$$, '42501', null, 'the active account changes only through set_active_org');

reset role;
set local role anon;
select throws_ok('select * from public.organizations', '42501', null, 'anon cannot read organisations');
select throws_ok('select * from public.organization_members', '42501', null, 'anon cannot read members');
reset role;

-- Invites (S-20): who may invite whom.
set local role authenticated;

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000005", "role": "authenticated"}', true);
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000001', 'booker', null, 'yemi@example.com')$$, '42501', null, 'a viewer cannot invite');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000001', 'viewer', null, 'yemi@example.com')$$, '42501', null, 'a booker cannot invite');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000001', 'owner', null, 'yemi@example.com')$$, '42501', null, 'an admin cannot make someone an owner');
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000001', 'driver', null, 'yemi@example.com')$$, '22023', null, 'a transporter role does not exist in a shipper organisation');
select is(char_length(set_config('test.token', public.create_invite('bbbbbbbb-0000-4000-8000-000000000001', 'booker', null, ' Yemi@Example.com '), true)), 32, 'an admin invites a booker and gets a link token');
select is((select count(*)::int from public.invites where email = 'yemi@example.com' and accepted_at is null), 1, 'the invite is listed for the team managers, with the email in lower case');
select throws_ok($$select token_hash from public.invites$$, '42501', null, 'the token hash is never readable');

reset role;
select is((select token_hash from public.invites where email = 'yemi@example.com'), encode(extensions.digest(current_setting('test.token'), 'sha256'), 'hex'), 'only the SHA-256 of the token is stored');
set local role anon;
select is((select org_name || ' · ' || role || ' · ' || invited_by_first_name || ' · ' || state from public.invite_details(current_setting('test.token'))), 'Okafor Foods Ltd · booker · Tunde · open', 'the invite page shows the organisation, role, inviter and state before sign-in');
select is((select count(*)::int from public.invite_details('not-a-real-token')), 0, 'a made-up token shows nothing');
reset role;

-- Accepting: only the person it was sent to, at an address Supabase Auth has confirmed, only once, only
-- before it expires.
update auth.users set email_confirmed_at = now() where id in ('aaaaaaaa-0000-4000-8000-000000000021', 'aaaaaaaa-0000-4000-8000-000000000022');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}', true);
select throws_ok(format('select public.accept_invite(%L)', current_setting('test.token')), '42501', null, 'a forwarded link does not work for someone else');

select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000022", "role": "authenticated"}', true);
reset role;
update auth.users set email_confirmed_at = null where id = 'aaaaaaaa-0000-4000-8000-000000000022';
set local role authenticated;
select throws_ok(format('select public.accept_invite(%L)', current_setting('test.token')), '42501', null, 'an address Supabase Auth has not confirmed does not count');
reset role;
update auth.users set email_confirmed_at = now() where id = 'aaaaaaaa-0000-4000-8000-000000000022';
set local role authenticated;
select is(public.accept_invite(current_setting('test.token')), 'bbbbbbbb-0000-4000-8000-000000000001'::uuid, 'the invited person accepts');
select is(public.member_role('bbbbbbbb-0000-4000-8000-000000000001'), 'booker', 'and is now a booker');
select is((select count(*)::int from public.my_accounts() where is_active and name = 'Okafor Foods Ltd'), 1, 'the new organisation becomes the active account');
select throws_ok(format('select public.accept_invite(%L)', current_setting('test.token')), 'P0002', null, 'a used invite cannot be used again');

reset role;
insert into public.invites (kind, org_id, email, role_payload, token_hash, expires_at)
values ('team_member', 'bbbbbbbb-0000-4000-8000-000000000001', 'ngozi@example.com', '{"shipper_role": "viewer"}', encode(extensions.digest('expired-invite-token-000000000000', 'sha256'), 'hex'), now() - interval '1 minute');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}', true);
select throws_ok($$select public.accept_invite('expired-invite-token-000000000000')$$, 'P0002', null, 'an expired invite is refused');

-- Transporter invites (§3): managers add drivers; only the owner adds managers; drivers add nobody.
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000012", "role": "authenticated"}', true);
select is(char_length(public.create_invite('bbbbbbbb-0000-4000-8000-000000000002', 'driver', '+2348031110010', null)), 32, 'a manager invites a driver');
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000002', 'manager', '+2348031110011', null)$$, '42501', null, 'a manager cannot add another manager');
reset role;
insert into public.invites (kind, org_id, phone, role_payload, token_hash)
values ('team_member', 'bbbbbbbb-0000-4000-8000-000000000002', '+2348031110013', '{"transporter_role": "manager"}', encode(extensions.digest('manager-invite-token-00000000000', 'sha256'), 'hex'));
set local role authenticated;
select is((select count(*)::int from public.invites where org_id = 'bbbbbbbb-0000-4000-8000-000000000002'), 1, 'a manager sees the driver invite but not an invite for a new manager');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000013", "role": "authenticated"}', true);
select throws_ok($$select public.create_invite('bbbbbbbb-0000-4000-8000-000000000002', 'driver', '+2348031110012', null)$$, '42501', null, 'a driver cannot add drivers');

-- Changing roles and removing people (S-20, T-16).
select set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated", "amr": [{"method": "otp", "timestamp": %s}]}', 'aaaaaaaa-0000-4000-8000-000000000002', extract(epoch from now())::bigint), true);
select lives_ok($$select public.change_member_role('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 'finance')$$, 'an admin changes a booker to finance');
select throws_ok($$select public.change_member_role('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'viewer')$$, '42501', null, 'an admin cannot change the owner''s role');
select throws_ok($$select public.remove_member('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')$$, '42501', null, 'an admin cannot remove the owner');
select lives_ok($$select public.remove_member('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000005')$$, 'an admin removes a viewer');

select set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated", "amr": [{"method": "otp", "timestamp": %s}]}', 'aaaaaaaa-0000-4000-8000-000000000001', extract(epoch from now())::bigint), true);
select throws_ok($$select public.remove_member('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001')$$, '23514', null, 'the last owner cannot leave');
select throws_ok($$select public.change_member_role('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'admin')$$, '23514', null, 'or step down without another owner');

select set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated", "amr": [{"method": "otp", "timestamp": %s}]}', 'aaaaaaaa-0000-4000-8000-000000000011', extract(epoch from now())::bigint), true);
select throws_ok($$select public.change_member_role('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000013', 'manager')$$, '22023', null, 'a driver is not turned into a manager by a role change');

-- The team list: names for everyone, contact details only for the people who manage the team.
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select email from public.team_members('bbbbbbbb-0000-4000-8000-000000000001') where full_name = 'Adaeze Okafor'), null, 'a team member without team rights does not see others'' contact details');
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select email from public.team_members('bbbbbbbb-0000-4000-8000-000000000001') where full_name = 'Chioma Eze'), 'chioma@okaforfoods.ng', 'the owner sees them, to manage the team');

-- Creating an organisation and switching accounts (A-04, A-09).
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-4000-8000-000000000021", "role": "authenticated"}', true);
select set_config('test.org', public.create_organization('shipper', '  Obi Ventures  ')::text, true);
select is(public.member_role(current_setting('test.org')::uuid), 'owner', 'whoever creates an organisation owns it');
select is((select name from public.my_accounts() where is_active), 'Obi Ventures', 'it becomes the active account, with its name trimmed');
select throws_ok($$select public.set_active_org('bbbbbbbb-0000-4000-8000-000000000002')$$, '42501', null, 'nobody switches to an organisation they are not in');
select throws_ok($$select public.create_organization('shipper', 'Obi Drivers', null, true)$$, '22023', null, 'shippers are not drivers');

select * from finish();
rollback;
