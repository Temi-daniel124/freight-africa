begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, instance_id, aud, role, email, phone, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('32132132-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p2348031230002@phone.freight-africa.com', '2348031230002', now(), '{"full_name": "Sani Bello"}', now(), now());
update public.profiles set phone = '+2348031230002' where id = '32132132-0000-4000-8000-000000000001';
insert into private.app_pins (user_id, pin_hash) values ('32132132-0000-4000-8000-000000000001', extensions.crypt('482915', extensions.gen_salt('bf', 8)));
create temp table v (name text primary key, t text);
grant all on v to authenticated, service_role;

-- Locking the account (the PIN removed) ends a live code (review of #120).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32132132-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'a', public.create_install_code();
reset role;
delete from private.app_pins where user_id = '32132132-0000-4000-8000-000000000001';
select is((select count(*)::int from private.install_codes where user_id = '32132132-0000-4000-8000-000000000001'), 0, 'removing the PIN ends the setup code');
set local role service_role;
select is(public.redeem_install_code('+2348031230002', (select t from v where name = 'a'), 'ip-a'), null::uuid, 'and the code no longer signs in');
reset role;

-- A new PIN also ends it.
insert into private.app_pins (user_id, pin_hash) values ('32132132-0000-4000-8000-000000000001', extensions.crypt('482915', extensions.gen_salt('bf', 8)));
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32132132-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'b', public.create_install_code();
reset role;
update private.app_pins set pin_hash = extensions.crypt('730164', extensions.gen_salt('bf', 8)) where user_id = '32132132-0000-4000-8000-000000000001';
select is((select count(*)::int from private.install_codes where user_id = '32132132-0000-4000-8000-000000000001'), 0, 'a new PIN ends the setup code');

-- Twenty tries from one address block it, whatever the number.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "32132132-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into v select 'c', public.create_install_code();
reset role;
set local role service_role;
do $$ begin
  for i in 1..20 loop perform public.redeem_install_code('+23480399900' || lpad(i::text, 2, '0'), '123456', 'ip-busy'); end loop;
end $$;
select is(public.redeem_install_code('+2348031230002', (select t from v where name = 'c'), 'ip-busy'), null::uuid, 'twenty tries from one address block it');
select is(public.redeem_install_code('+2348031230002', (select t from v where name = 'c'), 'ip-other'), '32132132-0000-4000-8000-000000000001'::uuid, 'another address still works');
reset role;

select * from finish();
rollback;
