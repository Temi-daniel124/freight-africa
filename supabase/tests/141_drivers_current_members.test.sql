begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a9a9a9a9-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@example.com', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('a9a9a9a9-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@example.com', now(), '{"full_name": "Sani Abubakar"}', now(), now());
insert into public.organizations (id, kind, name, tier) values ('c9c9c9c9-0000-4000-8000-000000000001', 'transporter', 'Musa Haulage Ltd', 'new');
insert into public.organization_members (org_id, user_id, transporter_role, is_driver) values
  ('c9c9c9c9-0000-4000-8000-000000000001', 'a9a9a9a9-0000-4000-8000-000000000001', 'owner', false),
  ('c9c9c9c9-0000-4000-8000-000000000001', 'a9a9a9a9-0000-4000-8000-000000000002', 'driver', true);
update public.drivers set status = 'suspended' where user_id = 'a9a9a9a9-0000-4000-8000-000000000002';
delete from public.organization_members where user_id = 'a9a9a9a9-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "a9a9a9a9-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select count(*)::int from public.drivers), 0, 'a former business no longer sees a driver who left');
select throws_ok($$select public.set_driver_paused('a9a9a9a9-0000-4000-8000-000000000002', false)$$, '42501', null, 'or pauses them');

select * from finish();
rollback;
