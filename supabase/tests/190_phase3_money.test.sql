begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- Cast: a sender (Adaeze, owner of Okafor Foods), a truck owner (Ibrahim, Musa Haulage) and his driver (Sani).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('19191919-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('19191919-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ibrahim@musahaulage.ng', now(), '{"full_name": "Ibrahim Musa"}', now(), now()),
  ('19191919-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@musahaulage.ng', now(), '{"full_name": "Sani Abubakar"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('19191919-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd', null),
  ('19191919-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'established');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('19191919-0000-4000-8000-0000000000a1', '19191919-0000-4000-8000-000000000001', 'owner', null, false),
  ('19191919-0000-4000-8000-0000000000b1', '19191919-0000-4000-8000-000000000002', null, 'owner', false),
  ('19191919-0000-4000-8000-0000000000b1', '19191919-0000-4000-8000-000000000003', null, 'driver', true);
insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status) values
  ('19191919-0000-4000-8000-0000000000c1', '19191919-0000-4000-8000-0000000000b1', 'KAN123XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'active'),
  ('19191919-0000-4000-8000-0000000000c2', '19191919-0000-4000-8000-0000000000b1', 'KAN456XY', (select id from public.truck_types where code = 'flatbed_30t'), 10000, 'active');

update public.drivers set status = 'active' where user_id = '19191919-0000-4000-8000-000000000003';

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated, service_role;

-- ---- The sender books ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "19191919-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select ok((select freight_kobo from public.quote_load('19191919-0000-4000-8000-0000000000a1', (select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano'), (select id from public.truck_types where code = 'flatbed_30t'))) > 0, 'Lagos to Kano on a flatbed has a price');
select is((select fee_kobo from public.quote_load('19191919-0000-4000-8000-0000000000a1', (select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano'), (select id from public.truck_types where code = 'flatbed_30t'))), 0::bigint, 'the first load has no service fee (D009)');
select throws_ok($$select public.create_load('19191919-0000-4000-8000-0000000000a1', (select id from public.truck_types where code = 'livestock'), now() + interval '1 day', now() + interval '2 days',
  jsonb_build_array(jsonb_build_object('city', (select id from public.cities where slug = 'kano'), 'address', 'Kano cattle market'), jsonb_build_object('city', (select id from public.cities where slug = 'lagos'), 'address', 'Agege abattoir')),
  jsonb_build_array(jsonb_build_object('goods', (select id from public.goods_categories where code = 'livestock'), 'description', 'Cattle', 'weight_kg', 9000)))$$,
  '22023', 'how many animals', 'livestock asks how many animals (D046)');
insert into ids select 'load', public.create_load('19191919-0000-4000-8000-0000000000a1', (select id from public.truck_types where code = 'flatbed_30t'), now() + interval '1 day', now() + interval '2 days',
  jsonb_build_array(jsonb_build_object('city', (select id from public.cities where slug = 'lagos'), 'address', 'Apapa port, Lagos'), jsonb_build_object('city', (select id from public.cities where slug = 'kano'), 'address', 'Dawanau market, Kano', 'name', 'Musa Danladi', 'phone', '+2348031234567')),
  jsonb_build_array(jsonb_build_object('goods', (select id from public.goods_categories where code = 'rice_bags'), 'description', 'Bags of rice', 'weight_kg', 24000, 'value_kobo', 500000000)));
select is((select status::text from public.loads where id = (select id from ids where name = 'load')), 'draft', 'a posted load starts as a draft');
insert into ids select 'payment', public.request_load_payment((select id from ids where name = 'load'));
select is((select status::text from public.loads where id = (select id from ids where name = 'load')), 'awaiting_payment', 'asking to pay waits for the money');
select throws_ok($$select public.confirm_payment('x', 'y', 100)$$, '42501', null, 'the browser can never confirm a payment');

-- ---- The money arrives (the provider, server side) -----------------------------------------------
reset role;
set local role service_role;
do $$ begin perform public.attach_collection((select id from ids where name = 'payment'), 'demo', 'demo-ref-1', '9912345678', 'Demo Bank'); end $$;
select is(public.confirm_payment('demo-ref-1', 'evt-1', (select total_kobo from public.loads where id = (select id from ids where name = 'load'))), 'funded', 'the full amount funds the load');
select is(public.confirm_payment('demo-ref-1', 'evt-1', (select total_kobo from public.loads where id = (select id from ids where name = 'load'))), 'duplicate', 'the same confirmation twice counts once');
reset role;
select is(private.ledger_balance(private.ledger_account('escrow', null, (select id from ids where name = 'load'))), (select total_kobo from public.loads where id = (select id from ids where name = 'load')), 'escrow holds exactly the total');
set local role service_role;
select is(public.confirm_payment('demo-ref-1', 'evt-2', 50000000), 'funded', 'paying again for a funded load');
reset role;
select is((select amount_kobo from public.refunds where idempotency_key = 'surplus:evt-2'), 50000000::bigint, 'the double payment is refunded, never kept');
select is(private.ledger_balance(private.ledger_account('escrow', null, (select id from ids where name = 'load'))), (select total_kobo from public.loads where id = (select id from ids where name = 'load')), 'escrow still holds exactly the total');
select throws_ok($$select private.queue_refund((select id from ids where name = 'load'), (select total_kobo + 1 from public.loads where id = (select id from ids where name = 'load')), 'too much', 'too-much')$$, '23514', null, 'a refund larger than what is held is refused');

-- ---- The owner takes it --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "19191919-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select ok((select count(*) from public.load_board('19191919-0000-4000-8000-0000000000b1')) >= 1, 'the funded load is on the board');
select throws_ok($$select public.accept_load((select id from ids where name = 'load'), '19191919-0000-4000-8000-0000000000c2')$$, '22023', 'this load is heavier than the truck can carry', 'never on a truck it is too heavy for (D046)');
select throws_ok($$select public.counter_load((select id from ids where name = 'load'), '19191919-0000-4000-8000-0000000000c1', (select freight_kobo * 2 from public.loads where id = (select id from ids where name = 'load')))$$, '22023', null, 'a counter is at most 20 percent more');
insert into ids select 'trip', public.accept_load((select id from ids where name = 'load'), '19191919-0000-4000-8000-0000000000c1', '19191919-0000-4000-8000-000000000003');
select is((select status::text from public.loads where id = (select id from ids where name = 'load')), 'matched', 'accepting matches the load');
select is((select advance_kobo from public.trip_money((select id from ids where name = 'trip'))), (select round(freight_kobo * 0.4 / 100) * 100 from public.loads where id = (select id from ids where name = 'load'))::bigint, 'an established owner gets 40 percent at loading');

-- ---- The driver never sees money (D003) ----------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "19191919-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*)::int from public.trips where id = (select id from ids where name = 'trip')), 1, 'the driver sees their trip');
select throws_ok($$select freight_kobo from public.trips$$, '42501', null, 'but not what it pays');
select is((select count(*)::int from public.trip_money((select id from ids where name = 'trip'))), 0, 'nor through trip_money');
select is((select count(*)::int from public.payouts), 0, 'nor any payout');
select is((select count(*)::int from public.payments), 0, 'nor any payment');

-- ---- Releases happen in order --------------------------------------------------------------------
reset role;
select throws_ok($$select private.release_balance((select id from ids where name = 'trip'), true)$$, '22023', null, 'no balance before loading');
select lives_ok($$select private.trip_loaded((select id from ids where name = 'trip'), null, 23500, null)$$, 'loading releases the advance');
select is((select status::text from public.payouts where idempotency_key = 'payout:' || (select id from ids where name = 'trip') || ':advance'), 'queued', 'the advance payout is queued');
select throws_ok($$select private.release_balance((select id from ids where name = 'trip'), true)$$, '22023', null, 'no balance before delivery');
select lives_ok($$select private.trip_delivered((select id from ids where name = 'trip'), null)$$, 'delivered');
select lives_ok($$select private.release_balance((select id from ids where name = 'trip'), true)$$, 'the balance is released');
select is(private.ledger_balance(private.ledger_account('escrow', null, (select id from ids where name = 'load'))), 0::bigint, 'escrow is empty after the trip');
select is(private.ledger_balance(private.ledger_account('owner_payable', '19191919-0000-4000-8000-0000000000b1', null)),
  (select freight_kobo - commission_kobo from public.trips where id = (select id from ids where name = 'trip')), 'the owner is owed the freight less commission');

select * from finish();
rollback;
