begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- Cast: a sender (Adaeze, Okafor Foods), a second sender (Bisi), and a truck owner (Ibrahim, Musa Haulage).
update public.settings set value = 'false' where key = 'first_trip_no_fee';
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('28282828-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('28282828-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bisi@lekkitraders.ng', now(), '{"full_name": "Bisi Adeyemi"}', now(), now()),
  ('28282828-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Ibrahim Musa"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('28282828-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd', null),
  ('28282828-0000-4000-8000-0000000000a2', 'shipper', 'Lekki Traders', null),
  ('28282828-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'established');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('28282828-0000-4000-8000-0000000000a1', '28282828-0000-4000-8000-000000000001', 'owner', null, false),
  ('28282828-0000-4000-8000-0000000000a2', '28282828-0000-4000-8000-000000000002', 'owner', null, false),
  ('28282828-0000-4000-8000-0000000000b1', '28282828-0000-4000-8000-000000000003', null, 'owner', false);

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated, service_role;
insert into ids values
  ('lagos', (select id from public.cities where slug = 'lagos')),
  ('kano', (select id from public.cities where slug = 'kano')),
  ('flatbed', (select id from public.truck_types where code = 'flatbed_30t')),
  ('rice', (select id from public.goods_categories where code = 'rice_bags')),
  ('corridor', (select id from public.corridors where (city_a_id, city_b_id) in (((select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano')), ((select id from public.cities where slug = 'kano'), (select id from public.cities where slug = 'lagos')))));
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status, approved_at, corridor_ids) values
  ('28282828-0000-4000-8000-0000000000c1', '28282828-0000-4000-8000-0000000000b1', 'KAN128XY', (select id from ids where name = 'flatbed'), 30000, 'active', now(), array[(select id from ids where name = 'corridor')]),
  ('28282828-0000-4000-8000-0000000000c2', '28282828-0000-4000-8000-0000000000b1', 'KAN129XY', (select id from ids where name = 'flatbed'), 30000, 'active', now(), array[(select id from ids where name = 'corridor')]);

create function pg_temp.load() returns uuid language sql as $$
  select public.create_load('28282828-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '1 day 6 hours',
    jsonb_build_array(
      jsonb_build_object('city', (select id from ids where name = 'lagos'), 'address', 'Apapa port, Lagos'),
      jsonb_build_object('city', (select id from ids where name = 'kano'), 'address', 'Dawanau market, Kano', 'name', 'Amina Bello', 'phone', '+2348065550142')),
    jsonb_build_array(jsonb_build_object('goods', (select id from ids where name = 'rice'), 'description', 'Bags of rice', 'quantity', 20, 'unit', 'tonnes', 'value_kobo', 600000000)));
$$;
create function pg_temp.pay(p_name text) returns void language plpgsql as $$
declare v_pay uuid;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000001", "role": "authenticated"}', true);
  v_pay := public.request_load_payment((select id from ids where name = p_name));
  reset role;
  perform public.attach_checkout(v_pay, 'demo', 'demo-co-' || v_pay, '/app/pay/demo/demo-co-' || v_pay);
  perform public.confirm_payment('demo-co-' || v_pay, 'evt-' || v_pay, (select amount_kobo from public.payments where id = v_pay));
end;
$$;
grant execute on function pg_temp.load() to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'draft', pg_temp.load();
insert into ids select 'funded', pg_temp.load();
insert into ids select 'pickup', pg_temp.load();
select is((select refund_kobo from public.cancel_quote((select id from ids where name = 'draft'))), 0::bigint, 'a draft: nothing to refund');
select ok((select allowed from public.cancel_quote((select id from ids where name = 'draft'))), 'and it can be cancelled');

reset role;
select pg_temp.pay('funded');
select pg_temp.pay('pickup');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select * from public.cancel_quote((select id from ids where name = 'funded'))$$, '42501', null, 'another business sees no quote');

select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select refund_kobo from public.cancel_quote((select id from ids where name = 'funded'))), (select total_kobo from public.loads where id = (select id from ids where name = 'funded')),
  'paid, no truck yet: everything comes back');
select is((select owner_fee_kobo + service_kobo from public.cancel_quote((select id from ids where name = 'funded'))), 0::bigint, 'with nothing kept');

-- A truck at pickup: the owner's fee and our service fee are kept (D019).
select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000003", "role": "authenticated"}', true);
insert into ids select 'trip', public.accept_load((select id from ids where name = 'pickup'), '28282828-0000-4000-8000-0000000000c1');
reset role;
update public.trips set status = 'at_pickup' where id = (select id from ids where name = 'trip');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000001", "role": "authenticated"}', true);
create temp table q as select * from public.cancel_quote((select id from ids where name = 'pickup'));
select is((select owner_fee_kobo from q), 2500000::bigint, 'the owner''s wasted trip is ₦25,000');
select is((select service_kobo from q), (select fee_kobo from public.loads where id = (select id from ids where name = 'pickup')), 'our service fee is kept');
select is((select refund_kobo + owner_fee_kobo + service_kobo from q), (select total_kobo from public.loads where id = (select id from ids where name = 'pickup')), 'the parts add up to what was held');

-- The quote is exactly what cancelling then refunds.
select is(public.cancel_load((select id from ids where name = 'pickup')), 'cancelled', 'the sender cancels at pickup');
reset role;
select is((select sum(amount_kobo)::bigint from public.refunds where load_id = (select id from ids where name = 'pickup')), (select refund_kobo from q), 'the refund is the quoted amount');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select allowed from public.cancel_quote((select id from ids where name = 'pickup'))), false, 'a cancelled booking can''t be cancelled again');

-- After loading, cancelling isn't offered.
reset role;
update public.trips set status = 'in_transit' where load_id = (select id from ids where name = 'funded');
update public.loads set status = 'matched' where id = (select id from ids where name = 'funded');
insert into public.trips (ref, load_id, transporter_org_id, truck_id, freight_kobo, commission_bps, commission_kobo, advance_bps, advance_kobo, status)
select 'TR-280', id, '28282828-0000-4000-8000-0000000000b1', '28282828-0000-4000-8000-0000000000c2', freight_kobo, 500, 0, 0, 0, 'in_transit' from public.loads where id = (select id from ids where name = 'funded');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "28282828-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select is((select allowed from public.cancel_quote((select id from ids where name = 'funded'))), false, 'once the goods are on the road, cancelling is a problem report instead');

select * from finish();
rollback;
