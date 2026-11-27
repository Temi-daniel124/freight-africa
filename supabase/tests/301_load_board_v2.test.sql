begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- A sender (Okafor Foods) posts an offer; an owner (Musa Haulage) and its driver look at the board.
update public.settings set value = 'false' where key = 'first_trip_no_fee';
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('30131313-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('30131313-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@musahaulage.ng', now(), '{"full_name": "Musa Danladi"}', now(), now()),
  ('30131313-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Musa Ibrahim"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('30131313-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd', null),
  ('30131313-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'gold');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('30131313-0000-4000-8000-0000000000a1', '30131313-0000-4000-8000-000000000001', 'owner', null, false),
  ('30131313-0000-4000-8000-0000000000b1', '30131313-0000-4000-8000-000000000002', null, 'owner', false),
  ('30131313-0000-4000-8000-0000000000b1', '30131313-0000-4000-8000-000000000003', null, 'driver', true);

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated, service_role;
insert into ids values
  ('lagos', (select id from public.cities where slug = 'lagos')),
  ('kano', (select id from public.cities where slug = 'kano')),
  ('flatbed', (select id from public.truck_types where code = 'flatbed_30t')),
  ('rice', (select id from public.goods_categories where code = 'rice_bags')),
  ('corridor', (select id from public.corridors where (city_a_id, city_b_id) in (((select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano')), ((select id from public.cities where slug = 'kano'), (select id from public.cities where slug = 'lagos')))));
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status, approved_at, corridor_ids) values
  ('30131313-0000-4000-8000-0000000000c1', '30131313-0000-4000-8000-0000000000b1', 'KAN301XY', (select id from ids where name = 'flatbed'), 30000, 'active', now(), array[(select id from ids where name = 'corridor')]);

-- The sender offers 92% of our price and pays it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30131313-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'load', public.create_load('30131313-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '1 day 6 hours',
  jsonb_build_array(
    jsonb_build_object('city', (select id from ids where name = 'lagos'), 'address', 'Apapa port, Lagos'),
    jsonb_build_object('city', (select id from ids where name = 'kano'), 'address', 'Dawanau market, Kano')),
  jsonb_build_array(jsonb_build_object('goods', (select id from ids where name = 'rice'), 'description', 'Rice', 'quantity', 20, 'unit', 'tonnes', 'value_kobo', 600000000)),
  null,
  (floor((select total_kobo from public.quote_booking('30131313-0000-4000-8000-0000000000a1', (select id from ids where name = 'lagos'), (select id from ids where name = 'kano'), (select id from ids where name = 'flatbed'))) * 0.92 / 100000) * 100000)::bigint);
insert into ids select 'pay', public.request_load_payment((select id from ids where name = 'load'));
reset role;
do $$ begin
  perform public.attach_checkout((select id from ids where name = 'pay'), 'demo', 'demo-co-301', '/app/pay/demo/demo-co-301');
  perform public.confirm_payment('demo-co-301', 'evt-301', (select amount_kobo from public.payments where id = (select id from ids where name = 'pay')));
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30131313-0000-4000-8000-000000000002", "role": "authenticated"}', true);
create temp table row1 as select * from public.load_board('30131313-0000-4000-8000-0000000000b1') where load_id = (select id from ids where name = 'load');
select is((select offered from row1), true, 'the board says it is the sender''s own price');
select ok((select list_freight_kobo > freight_kobo from row1), 'and shows our listed price above it');
select is((select sender_name from row1), 'Okafor Foods Ltd', 'with the sender''s business name (no phone, no address)');
select is((select replied from row1), false, 'not yet replied');

-- A driver doesn't get the board.
select set_config('request.jwt.claims', '{"sub": "30131313-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.load_board('30131313-0000-4000-8000-0000000000b1')), 0, 'a driver sees no loads');

select * from finish();
rollback;
