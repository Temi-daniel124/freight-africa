begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('abababab-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ngozi@example.com', now(), '{"full_name": "Ngozi Eze"}', now(), now()),
  ('abababab-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tunde@example.com', now(), '{"full_name": "Tunde Bakare"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "abababab-0000-4000-8000-000000000001", "role": "authenticated"}', true);
update public.profiles set joining_as = 'owner' where id = 'abababab-0000-4000-8000-000000000001';
select is((select joining_as from public.profiles where id = 'abababab-0000-4000-8000-000000000001'), 'owner', 'a person saves what they are joining as');
select throws_ok($$update public.profiles set joining_as = 'super_admin' where id = 'abababab-0000-4000-8000-000000000001'$$, '23514', null, 'only the sign-up choices are accepted');
update public.profiles set joining_as = 'shipper' where id = 'abababab-0000-4000-8000-000000000002';
reset role;
select is((select joining_as from public.profiles where id = 'abababab-0000-4000-8000-000000000002'), null, 'nobody changes someone else''s');

select * from finish();
rollback;
