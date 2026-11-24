begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values ('cdcdcdcd-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amaka@example.com', now(), '{"full_name": "Amaka Obi"}', now(), now());

select is((select is_demo from public.profiles where id = 'cdcdcdcd-0000-4000-8000-000000000001'), false, 'people are not demo accounts unless marked');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "cdcdcdcd-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$update public.profiles set is_demo = true where id = 'cdcdcdcd-0000-4000-8000-000000000001'$$, '42501', null, 'nobody marks themselves as a demo account');
select ok(not public.am_i_demo(), 'a real person is not demo');
reset role;
update public.profiles set is_demo = true where id = 'cdcdcdcd-0000-4000-8000-000000000001';
set local role authenticated;
select ok(public.am_i_demo(), 'a marked demo account knows it');

select * from finish();
rollback;
