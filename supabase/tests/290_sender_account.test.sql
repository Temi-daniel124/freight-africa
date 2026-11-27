begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Cast: Okafor Foods with an owner (Adaeze), a booker (Tunde) and a viewer (Kemi); and Lekki Traders (Bisi).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('29292929-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('29292929-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tunde@okaforfoods.ng', now(), '{"full_name": "Tunde Bello"}', now(), now()),
  ('29292929-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@okaforfoods.ng', now(), '{"full_name": "Kemi Ade"}', now(), now()),
  ('29292929-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bisi@lekkitraders.ng', now(), '{"full_name": "Bisi Adeyemi"}', now(), now());
insert into public.organizations (id, kind, name) values
  ('29292929-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd'),
  ('29292929-0000-4000-8000-0000000000a2', 'shipper', 'Lekki Traders');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('29292929-0000-4000-8000-0000000000a1', '29292929-0000-4000-8000-000000000001', 'owner', null, false),
  ('29292929-0000-4000-8000-0000000000a1', '29292929-0000-4000-8000-000000000002', 'booker', null, false),
  ('29292929-0000-4000-8000-0000000000a1', '29292929-0000-4000-8000-000000000003', 'viewer', null, false),
  ('29292929-0000-4000-8000-0000000000a2', '29292929-0000-4000-8000-000000000004', 'owner', null, false);

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values ('lagos', (select id from public.cities where slug = 'lagos'));

set local role authenticated;
-- A booker saves places and receivers.
select set_config('request.jwt.claims', '{"sub": "29292929-0000-4000-8000-000000000002", "role": "authenticated"}', true);
insert into ids select 'place', public.save_place('29292929-0000-4000-8000-0000000000a1', null, 'Apapa warehouse', (select id from ids where name = 'lagos'), 'Wharf Rd, Apapa', 'by NPA gate');
select is((select label from public.saved_places where id = (select id from ids where name = 'place')), 'Apapa warehouse', 'a booker saves a place');
insert into ids select 'receiver', public.save_receiver('29292929-0000-4000-8000-0000000000a1', null, 'Amina Bello', '+2348065550142', 'Amina@Example.ng');
select is((select email from public.saved_receivers where id = (select id from ids where name = 'receiver')), 'amina@example.ng', 'and a receiver, email in lower case');
select is(public.save_receiver('29292929-0000-4000-8000-0000000000a1', null, 'Amina B.', '+2348065550142'), (select id from ids where name = 'receiver'), 'the same phone updates the receiver instead of adding a second');
select throws_ok($$select public.save_receiver('29292929-0000-4000-8000-0000000000a1', null, 'No phone', '0806')$$, '23514', null, 'a phone is in +234 form');

-- A viewer reads but can't change.
select set_config('request.jwt.claims', '{"sub": "29292929-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.saved_receivers), 0, 'a viewer doesn''t see saved phone numbers');
select throws_ok($$select public.save_place('29292929-0000-4000-8000-0000000000a1', null, 'X', (select id from ids where name = 'lagos'), 'Somewhere road')$$, '42501', null, 'a viewer can''t add one');
select throws_ok($$select public.delete_saved('place', (select id from ids where name = 'place'))$$, '42501', null, 'or delete one');

-- Another business sees and changes nothing.
select set_config('request.jwt.claims', '{"sub": "29292929-0000-4000-8000-000000000004", "role": "authenticated"}', true);
select is((select count(*)::int from public.saved_places) + (select count(*)::int from public.saved_receivers), 0, 'another business sees no places or receivers');
select throws_ok($$select public.save_place('29292929-0000-4000-8000-0000000000a2', (select id from ids where name = 'place'), 'Mine now', (select id from ids where name = 'lagos'), 'Wharf Rd, Apapa')$$, '42501', null, 'and can''t take one over by its id');
select throws_ok($$select public.delete_saved('receiver', (select id from ids where name = 'receiver'))$$, '42501', null, 'or delete one');

-- The business profile: owners and admins only.
select set_config('request.jwt.claims', '{"sub": "29292929-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.update_business_profile('29292929-0000-4000-8000-0000000000a1', 'Okafor Foods Ltd', 'RC1234567', '12 Creek Road, Apapa, Lagos', 'accounts@okaforfoods.ng')$$, '42501', null, 'a booker can''t change the business profile');
select set_config('request.jwt.claims', '{"sub": "29292929-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select lives_ok($$select public.update_business_profile('29292929-0000-4000-8000-0000000000a1', 'Okafor Foods Ltd', 'RC1234567', '12 Creek Road, Apapa, Lagos', 'Accounts@OkaforFoods.ng')$$, 'the owner can');
select is((select receipt_email from public.organizations where id = '29292929-0000-4000-8000-0000000000a1'), 'accounts@okaforfoods.ng', 'the receipt email is saved');

-- The owner deletes a place.
select lives_ok($$select public.delete_saved('place', (select id from ids where name = 'place'))$$, 'the owner deletes a place');

select * from finish();
rollback;
