begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Sani (a driver, signed up by phone) and Bisi (someone else).
insert into auth.users (id, instance_id, aud, role, email, phone, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('32323232-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p2348031230001@phone.freight-africa.com', '2348031230001', now(), '{"full_name": "Sani Bello"}', now(), now()),
  ('32323232-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bisi@example.ng', null, now(), '{"full_name": "Bisi Adeyemi"}', now(), now());
update public.profiles set phone = '+2348031230001' where id = '32323232-0000-4000-8000-000000000001';

create temp table v (name text primary key, t text);
grant all on v to authenticated, service_role;
-- Sani has a PIN (a setup code needs one); each try below comes from its own internet address.
insert into private.app_pins (user_id, pin_hash) values ('32323232-0000-4000-8000-000000000001', extensions.crypt('482915', extensions.gen_salt('bf', 8)));
create function pg_temp.redeem(p_phone text, p_code text) returns uuid language sql as $$ select public.redeem_install_code(p_phone, p_code, gen_random_uuid()::text) $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32323232-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select lives_ok($$select public.install_started('32323232-0000-4000-8000-00000000d001', 'android')$$, 'Install tapped: waiting');
select is((select state from public.app_installs where device_id = '32323232-0000-4000-8000-00000000d001'), 'waiting', 'tapping Install is never "installed"');
select is(public.install_checkin('32323232-0000-4000-8000-00000000d001', 'android', false), false, 'a browser tab checking in is not an install');
select is(public.install_checkin('32323232-0000-4000-8000-00000000d001', 'android', true), true, 'the home-screen app checking in is');
select is((select state from public.app_installs where device_id = '32323232-0000-4000-8000-00000000d001'), 'installed', 'and the device is recorded as installed');

-- Bisi can't see Sani's installs.
select set_config('request.jwt.claims', '{"sub": "32323232-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.app_installs), 0, 'nobody else sees the installs');

-- iPhone: a setup code made in the browser, used once in the home-screen app.
select set_config('request.jwt.claims', '{"sub": "32323232-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'code', public.create_install_code();
select ok((select t ~ '^[0-9]{6}$' from v where name = 'code'), 'the setup code is six digits');
select throws_ok($$select public.redeem_install_code('+2348031230001', (select t from v where name = 'code'), 'ip')$$, '42501', null, 'the browser can''t redeem a code');
reset role;
set local role service_role;
select is(pg_temp.redeem('+2348031230001', '00000a'), null::uuid, 'a wrong code gives nothing');
select is(pg_temp.redeem('+2348031230001', null), null::uuid, 'a missing code gives nothing (review)');
select is(pg_temp.redeem('+2348039999999', '123456'), null::uuid, 'an unknown number gives nothing');
select is(pg_temp.redeem('+2348031230001', (select t from v where name = 'code')), '32323232-0000-4000-8000-000000000001'::uuid, 'the right code, with the phone number, signs the app in once');
select is(pg_temp.redeem('+2348031230001', (select t from v where name = 'code')), null::uuid, 'and never again');
reset role;
-- Five wrong tries end a code.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32323232-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'code2', public.create_install_code();
reset role;
set local role service_role;
do $$ begin
  for i in 1..5 loop perform pg_temp.redeem('+2348031230001', '99999x'); end loop;
end $$;
select is(pg_temp.redeem('+2348031230001', (select t from v where name = 'code2')), null::uuid, 'after five wrong tries even the right code is refused');
-- Ten tries on a number block it, even with the right code; the owner's new code lifts the block.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32323232-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'code3', public.create_install_code();
reset role;
set local role service_role;
do $$ begin
  for i in 1..10 loop perform pg_temp.redeem('+2348031230001', null); end loop;
end $$;
reset role;
update private.install_codes set tries = 0 where user_id = '32323232-0000-4000-8000-000000000001';
set local role service_role;
select is(pg_temp.redeem('+2348031230001', (select t from v where name = 'code3')), null::uuid, 'after ten tries on the number, even the right code waits');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32323232-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'code4', public.create_install_code();
reset role;
set local role service_role;
select is(pg_temp.redeem('+2348031230001', (select t from v where name = 'code4')), '32323232-0000-4000-8000-000000000001'::uuid, 'a new code from the owner lifts the block');
reset role;

select * from finish();
rollback;
