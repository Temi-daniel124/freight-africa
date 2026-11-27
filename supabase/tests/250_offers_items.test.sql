begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

-- Cast: a sender (Adaeze, Okafor Foods), a truck owner (Ibrahim, Musa Haulage) with two flatbeds that work
-- Lagos–Kano, and a second owner (Emeka) who only replies. The service fee is on (not a first load).
update public.settings set value = 'false' where key = 'first_trip_no_fee';
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('25252525-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('25252525-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('25252525-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emeka@nwosu.ng', now(), '{"full_name": "Emeka Nwosu"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('25252525-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd', null),
  ('25252525-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'established'),
  ('25252525-0000-4000-8000-0000000000b2', 'transporter', 'Emeka Nwosu Transport', 'new');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('25252525-0000-4000-8000-0000000000a1', '25252525-0000-4000-8000-000000000001', 'owner', null, false),
  ('25252525-0000-4000-8000-0000000000b1', '25252525-0000-4000-8000-000000000002', null, 'owner', false),
  ('25252525-0000-4000-8000-0000000000b2', '25252525-0000-4000-8000-000000000003', null, 'owner', false);

create temp table ids (name text primary key, id uuid);
create temp table n (name text primary key, v bigint);
grant all on ids, n to authenticated, service_role;
insert into ids values
  ('lagos', (select id from public.cities where slug = 'lagos')),
  ('kano', (select id from public.cities where slug = 'kano')),
  ('flatbed', (select id from public.truck_types where code = 'flatbed_30t')),
  ('rice', (select id from public.goods_categories where code = 'rice_bags')),
  ('corridor', (select id from public.corridors where (city_a_id, city_b_id) in (((select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano')), ((select id from public.cities where slug = 'kano'), (select id from public.cities where slug = 'lagos')))));
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status, approved_at, corridor_ids) values
  ('25252525-0000-4000-8000-0000000000c1', '25252525-0000-4000-8000-0000000000b1', 'KAN125XY', (select id from ids where name = 'flatbed'), 30000, 'active', now(), array[(select id from ids where name = 'corridor')]),
  ('25252525-0000-4000-8000-0000000000c2', '25252525-0000-4000-8000-0000000000b1', 'KAN126XY', (select id from ids where name = 'flatbed'), 30000, 'active', now(), array[(select id from ids where name = 'corridor')]),
  ('25252525-0000-4000-8000-0000000000c3', '25252525-0000-4000-8000-0000000000b2', 'ENU127XY', (select id from ids where name = 'flatbed'), 30000, 'active', now(), array[(select id from ids where name = 'corridor')]);

create function pg_temp.stops() returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('city', (select id from ids where name = 'lagos'), 'address', 'Apapa port, Lagos'),
    jsonb_build_object('city', (select id from ids where name = 'kano'), 'address', 'Dawanau market, Kano', 'name', 'Amina Bello', 'phone', '+2348065550142'));
$$;
create function pg_temp.items() returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('goods', (select id from ids where name = 'rice'), 'description', 'Bags of rice', 'quantity', 600, 'unit', 'bags', 'unit_weight_kg', 50, 'value_kobo', 600000000),
    jsonb_build_object('goods', (select id from ids where name = 'rice'), 'description', 'Cartons of noodles', 'quantity', 200, 'unit', 'cartons', 'value_kobo', 240000000));
$$;
create function pg_temp.escrow(p_load text) returns bigint language sql as $$
  select private.ledger_balance(private.ledger_account('escrow', null, (select id from ids where name = p_load)));
$$;
grant execute on function pg_temp.stops(), pg_temp.items(), pg_temp.escrow(text) to authenticated, service_role;

-- ---- The quote and the offer floor (D047) --------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into n select 'list_total', total_kobo from public.quote_booking('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'lagos'), (select id from ids where name = 'kano'), (select id from ids where name = 'flatbed'));
select ok((select v from n where name = 'list_total') > 0, 'Lagos to Kano on a flatbed has a price');
select is((select min_offer_kobo from public.quote_booking('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'lagos'), (select id from ids where name = 'kano'), (select id from ids where name = 'flatbed'))),
  (ceil((select v from n where name = 'list_total') * 0.8 / 100000) * 100000)::bigint, 'the lowest offer is 80 percent of our price, rounded up to a thousand naira');
select is((select usual_low_kobo from public.quote_booking('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'lagos'), (select id from ids where name = 'kano'), (select id from ids where name = 'flatbed'))),
  null::bigint, 'no "usual" range without real trips behind it');
select is((select free from public.day_availability('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'lagos'), (select id from ids where name = 'kano'), 3)
  where truck_type_id = (select id from ids where name = 'flatbed') and day = (now() at time zone 'Africa/Lagos')::date + 1) >= 3, true, 'the three flatbeds on the route are free tomorrow');

-- ---- Several goods (D055) --------------------------------------------------------------------------
insert into ids select 'atprice', public.create_load('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '1 day 6 hours', pg_temp.stops(), pg_temp.items());
select is((select count(*)::int from public.load_items where load_id = (select id from ids where name = 'atprice')), 2, 'both items are kept');
select is((select declared_value_kobo from public.loads where id = (select id from ids where name = 'atprice')), 840000000::bigint, 'the load holds the total value');
select is((select weight_kg from public.loads where id = (select id from ids where name = 'atprice')), null::int, 'the total weight is unknown when an item has no weight (the driver confirms it)');
select is((select list_freight_kobo from public.loads where id = (select id from ids where name = 'atprice')), null::bigint, 'booked at our price: no offer');
select throws_ok($$select public.create_load('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '2 days', pg_temp.stops(), '[]'::jsonb)$$,
  '22023', 'one to ten items', 'a booking has at least one item');
select throws_ok($$select public.create_load('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '2 days', pg_temp.stops(),
  jsonb_build_array(jsonb_build_object('goods', (select id from ids where name = 'rice'), 'description', 'Rice', 'quantity', 40, 'unit', 'tonnes')))$$,
  '22023', 'too heavy for that truck type', 'forty tonnes never goes on a flatbed');

-- ---- Offers (D047) -----------------------------------------------------------------------------------
reset role;
insert into n select 'floor', private.offer_floor((select v from n where name = 'list_total'));
insert into n select 'offer', (floor((select v from n where name = 'list_total') * 0.92 / 100000) * 100000)::bigint;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok(format($$select public.create_load('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '2 days', pg_temp.stops(), pg_temp.items(), null, %s)$$, (select v - 100000 from n where name = 'floor')),
  '22023', null, 'an offer under the floor is refused');
select throws_ok(format($$select public.create_load('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '2 days', pg_temp.stops(), pg_temp.items(), null, %s)$$, (select v + 500 from n where name = 'offer')),
  '22023', null, 'an offer is in whole thousands of naira');
insert into ids select 'offer', public.create_load('25252525-0000-4000-8000-0000000000a1', (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '1 day 6 hours', pg_temp.stops(), pg_temp.items(), 'Stack cartons on top', (select v from n where name = 'offer'));
select is((select total_kobo from public.loads where id = (select id from ids where name = 'offer')), (select v from n where name = 'offer'), 'the offer is exactly what the sender pays');
select ok((select fee_kobo > 0 and freight_kobo + fee_kobo = total_kobo and list_freight_kobo > freight_kobo from public.loads where id = (select id from ids where name = 'offer')), 'the fee comes out of the offer and our price is kept');
insert into ids select 'offer_pay', public.request_load_payment((select id from ids where name = 'offer'));
select is((select amount_kobo from public.payments where id = (select id from ids where name = 'offer_pay')), (select v from n where name = 'offer'), 'paying asks for the offer, not our price');

reset role;
set local role service_role;
do $$ begin perform public.attach_collection((select id from ids where name = 'offer_pay'), 'demo', 'demo-offer-1', '9912345670', 'Demo Bank'); end $$;
select is(public.confirm_payment('demo-offer-1', 'evt-offer-1', (select v from n where name = 'offer')), 'funded', 'the offer is paid and held');
reset role;
select is(pg_temp.escrow('offer'), (select v from n where name = 'offer'), 'escrow holds exactly the offer');

-- ---- An owner replies; the sender offers again once ------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.counter_load((select id from ids where name = 'offer'), '25252525-0000-4000-8000-0000000000c1', (select list_freight_kobo * 13 / 10 from public.loads where id = (select id from ids where name = 'offer')))$$,
  '22023', null, 'a reply is at most 20 percent over our price');
insert into ids select 'counter', public.counter_load((select id from ids where name = 'offer'), '25252525-0000-4000-8000-0000000000c1', (select list_freight_kobo from public.loads where id = (select id from ids where name = 'offer')));
select is((select amount_kobo from public.offers where id = (select id from ids where name = 'counter')), (select list_freight_kobo from public.loads where id = (select id from ids where name = 'offer')), 'the owner asks for our price');
select throws_ok($$select public.reoffer_counter((select id from ids where name = 'counter'), 200000000)$$, '42501', null, 'only the sender offers again');

reset role;
insert into n select 'counter_total', l.total_kobo + private.top_up_for(l, o.amount_kobo)
  from public.offers o join public.loads l on l.id = o.load_id where o.id = (select id from ids where name = 'counter');
insert into n select 'reoffer', (floor(((select v from n where name = 'offer') + (select v from n where name = 'counter_total')) / 2.0 / 100000) * 100000)::bigint;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok(format($$select public.reoffer_counter((select id from ids where name = 'counter'), %s)$$, (select v from n where name = 'counter_total')),
  '22023', null, 'a new offer is below their price');
select throws_ok(format($$select public.reoffer_counter((select id from ids where name = 'counter'), %s)$$, (select v from n where name = 'offer')),
  '22023', null, 'and above the first offer');
insert into n select 'quote', public.reoffer_quote((select id from ids where name = 'counter'), (select v from n where name = 'reoffer'));
insert into ids select 'reoffer', public.reoffer_counter((select id from ids where name = 'counter'), (select v from n where name = 'reoffer'));
select is((select status::text from public.offers where id = (select id from ids where name = 'counter')), 'declined', 'the reply is answered by the new offer');
select throws_ok(format($$select public.reoffer_counter((select id from ids where name = 'counter'), %s)$$, (select v from n where name = 'reoffer')),
  '22023', null, 'one new offer per owner');
select ok((select expires_at <= now() + interval '61 minutes' from public.offers where id = (select id from ids where name = 'reoffer')), 'the owner has an hour to answer');
select throws_ok($$select public.answer_reoffer((select id from ids where name = 'reoffer'), true)$$, '42501', null, 'the sender cannot answer for the owner');

select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select throws_ok($$select public.answer_reoffer((select id from ids where name = 'reoffer'), true)$$, '42501', null, 'nor can another owner');

select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000002", "role": "authenticated"}', true);
insert into ids select 'topup', public.answer_reoffer((select id from ids where name = 'reoffer'), true);
select is((select amount_kobo from public.payments where id = (select id from ids where name = 'topup')), (select v from n where name = 'quote'), 'the difference asked is exactly what the screen showed');

reset role;
set local role service_role;
do $$ begin perform public.attach_collection((select id from ids where name = 'topup'), 'demo', 'demo-topup-1', '9912345671', 'Demo Bank'); end $$;
select is(public.confirm_payment('demo-topup-1', 'evt-topup-1', (select v from n where name = 'quote') - 100000), 'partial', 'part of the difference waits');
select is((select status::text from public.loads where id = (select id from ids where name = 'offer')), 'funded', 'no trip until the difference is paid in full');
select is(public.confirm_payment('demo-topup-1', 'evt-topup-2', 100000), 'funded', 'the rest arrives');
reset role;
select is((select status::text from public.loads where id = (select id from ids where name = 'offer')), 'matched', 'the trip goes ahead at the new price');
select is((select tr.freight_kobo + private.fee_due(tr.load_id, tr.freight_kobo) from public.trips tr where tr.load_id = (select id from ids where name = 'offer')),
  pg_temp.escrow('offer'), 'what is held is exactly the freight and the fee owed (money balances)');
select ok(pg_temp.escrow('offer') < (select v from n where name = 'counter_total'), 'and less than the owner first asked');

-- ---- No truck yet: raise, change the day, keep waiting (P11c) --------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'atprice_pay', public.request_load_payment((select id from ids where name = 'atprice'));
reset role;
set local role service_role;
do $$ begin perform public.attach_collection((select id from ids where name = 'atprice_pay'), 'demo', 'demo-atprice-1', '9912345672', 'Demo Bank'); end $$;
select is(public.confirm_payment('demo-atprice-1', 'evt-atprice-1', (select total_kobo from public.loads where id = (select id from ids where name = 'atprice'))), 'funded', 'a second booking is paid');
reset role;
insert into n select 'old_total', total_kobo from public.loads where id = (select id from ids where name = 'atprice');
insert into n select 'raised', (ceil((select v from n where name = 'old_total') * 1.05 / 100000) * 100000)::bigint;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok(format($$select public.raise_load_price((select id from ids where name = 'atprice'), %s)$$, (select v from n where name = 'old_total')), '22023', null, 'a raise is above the price');
insert into ids select 'raise', public.raise_load_price((select id from ids where name = 'atprice'), (select v from n where name = 'raised'));
select is((select amount_kobo from public.payments where id = (select id from ids where name = 'raise')), (select v - (select v from n where name = 'old_total') from n where name = 'raised'), 'a raise asks only for the difference');
reset role;
set local role service_role;
do $$ begin perform public.attach_collection((select id from ids where name = 'raise'), 'demo', 'demo-raise-1', '9912345673', 'Demo Bank'); end $$;
select is(public.confirm_payment('demo-raise-1', 'evt-raise-1', 100000), 'partial', 'a part of the raise waits');
reset role;
select is((select total_kobo from public.loads where id = (select id from ids where name = 'atprice')), (select v from n where name = 'old_total'), 'and changes nothing yet');
set local role service_role;
select is(public.confirm_payment('demo-raise-1', 'evt-raise-2', (select amount_kobo - 100000 from public.payments where id = (select id from ids where name = 'raise'))), 'funded', 'the raise is paid in full');
reset role;
select is((select total_kobo from public.loads where id = (select id from ids where name = 'atprice')), (select v from n where name = 'raised'), 'the load takes the raised price');
select is(pg_temp.escrow('atprice'), (select v from n where name = 'raised'), 'escrow holds exactly the raised price');
set local role service_role;
select is(public.confirm_payment('demo-raise-1', 'evt-raise-3', 50000), 'funded', 'more money for a raise already applied');
reset role;
select is(pg_temp.escrow('atprice'), (select v from n where name = 'raised'), 'is refunded, never a second raise');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000002", "role": "authenticated"}', true);
insert into ids select 'counter2', public.counter_load((select id from ids where name = 'atprice'), '25252525-0000-4000-8000-0000000000c2', (select freight_kobo + 10000000 from public.loads where id = (select id from ids where name = 'atprice')));
select set_config('request.jwt.claims', '{"sub": "25252525-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select lives_ok($$select public.change_load_day((select id from ids where name = 'atprice'), now() + interval '2 days', now() + interval '2 days 6 hours')$$, 'the sender moves the day');
select is((select status::text from public.offers where id = (select id from ids where name = 'counter2')), 'expired', 'replies for the old day close');
select lives_ok($$select public.keep_waiting((select id from ids where name = 'atprice'))$$, 'keep waiting');
select ok((select no_truck_decision_due_at > now() + interval '23 hours' from public.loads where id = (select id from ids where name = 'atprice')), 'gives another day before asking again');
select throws_ok(format($$select public.raise_load_price((select id from ids where name = 'offer'), %s)$$, (select v + 1000000 from n where name = 'reoffer')), '22023', null, 'a load with a truck cannot be raised');

-- ---- Who can call what ----------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$select public.quote_booking('25252525-0000-4000-8000-0000000000a1', null, null, null)$$, '42501', null, 'signed-out visitors get no quotes');
reset role;

select * from finish();
rollback;
