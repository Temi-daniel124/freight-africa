begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Musa Haulage (owner Musa, drivers Sani and Bello) has a trip assigned to Sani; Emeka's owner is a stranger.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('35035035-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@musahaulage.ng', now(), '{"full_name": "Musa Danladi"}', now(), now()),
  ('35035035-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sani@musahaulage.ng', now(), '{"full_name": "Sani Bello"}', now(), now()),
  ('35035035-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bello@musahaulage.ng', now(), '{"full_name": "Bello Yusuf"}', now(), now()),
  ('35035035-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emeka@emeka.ng', now(), '{"full_name": "Emeka Obi"}', now(), now()),
  ('35035035-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ada@adastores.ng', now(), '{"full_name": "Ada Eze"}', now(), now());
insert into public.organizations (id, kind, name, tier) values
  ('35035035-0000-4000-8000-0000000000b1', 'transporter', 'Musa Haulage Ltd', 'gold'),
  ('35035035-0000-4000-8000-0000000000b2', 'transporter', 'Emeka Transport', 'new'),
  ('35035035-0000-4000-8000-0000000000a1', 'shipper', 'Ada Stores', null);
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('35035035-0000-4000-8000-0000000000b1', '35035035-0000-4000-8000-000000000001', null, 'owner', false),
  ('35035035-0000-4000-8000-0000000000b1', '35035035-0000-4000-8000-000000000002', null, 'driver', true),
  ('35035035-0000-4000-8000-0000000000b1', '35035035-0000-4000-8000-000000000003', null, 'driver', true),
  ('35035035-0000-4000-8000-0000000000b2', '35035035-0000-4000-8000-000000000004', null, 'owner', false),
  ('35035035-0000-4000-8000-0000000000a1', '35035035-0000-4000-8000-000000000005', 'owner', null, false);
insert into public.drivers (user_id, org_id, status) values
  ('35035035-0000-4000-8000-000000000002', '35035035-0000-4000-8000-0000000000b1', 'active'),
  ('35035035-0000-4000-8000-000000000003', '35035035-0000-4000-8000-0000000000b1', 'active')
on conflict (user_id) do update set org_id = excluded.org_id, status = 'active';

insert into public.trucks (id, org_id, plate_number, truck_type_id, capacity_kg, status, approved_at) values
  ('35035035-0000-4000-8000-0000000000c1', '35035035-0000-4000-8000-0000000000b1', 'KAN350XY', (select id from public.truck_types where code = 'flatbed_30t'), 30000, 'active', now());
insert into public.loads (id, ref, shipper_org_id, from_city_id, to_city_id, goods_category_id, truck_type_id, pickup_from, pickup_until, freight_kobo, fee_bps, fee_kobo, total_kobo, status)
values ('35035035-0000-4000-8000-0000000000d1', 'FA-35035', '35035035-0000-4000-8000-0000000000a1', (select id from public.cities where slug = 'lagos'), (select id from public.cities where slug = 'kano'),
  (select id from public.goods_categories where code = 'rice_bags'), (select id from public.truck_types where code = 'flatbed_30t'), now() + interval '1 day', now() + interval '1 day 6 hours', 100000000, 300, 3000000, 103000000, 'matched');
insert into public.trips (id, ref, load_id, transporter_org_id, truck_id, driver_id, freight_kobo, commission_bps, commission_kobo, advance_bps, advance_kobo, status)
values ('35035035-0000-4000-8000-0000000000e1', 'FA-35035-T1', '35035035-0000-4000-8000-0000000000d1', '35035035-0000-4000-8000-0000000000b1', '35035035-0000-4000-8000-0000000000c1',
  '35035035-0000-4000-8000-000000000002', 100000000, 400, 4000000, 5000, 50000000, 'assigned');

insert into public.ledger_transactions (id, kind, idempotency_key) values ('35035035-0000-4000-8000-0000000000aa', 'payout', 'test-350-payout');
insert into public.payouts (id, trip_id, kind, org_id, amount_kobo, ledger_transaction_id, status, idempotency_key)
values ('35035035-0000-4000-8000-0000000000ab', '35035035-0000-4000-8000-0000000000e1', 'advance', '35035035-0000-4000-8000-0000000000b1', 50000000, '35035035-0000-4000-8000-0000000000aa', 'processing', 'test-350-payout-1');

-- SYSTEM-LOGIC 7.5: tried again at 1, 5, 15 and 60 minutes, then failed.
select is(public.money_out_failed('payout', '35035035-0000-4000-8000-0000000000ab', 'bank timeout'), 'queued', 'first failure: try again');
select ok((select next_attempt_at between now() + interval '59 seconds' and now() + interval '61 seconds' from public.payouts where id = '35035035-0000-4000-8000-0000000000ab'), 'in 1 minute');
update public.payouts set status = 'processing' where id = '35035035-0000-4000-8000-0000000000ab';
select public.money_out_failed('payout', '35035035-0000-4000-8000-0000000000ab', 'bank timeout');
select ok((select next_attempt_at between now() + interval '299 seconds' and now() + interval '301 seconds' from public.payouts where id = '35035035-0000-4000-8000-0000000000ab'), 'then in 5 minutes');
do $$ begin
  for i in 1..2 loop
    update public.payouts set status = 'processing' where id = '35035035-0000-4000-8000-0000000000ab';
    perform public.money_out_failed('payout', '35035035-0000-4000-8000-0000000000ab', 'bank timeout');
  end loop;
end $$;
update public.payouts set status = 'processing' where id = '35035035-0000-4000-8000-0000000000ab';
select is(public.money_out_failed('payout', '35035035-0000-4000-8000-0000000000ab', 'account closed'), 'failed', 'after four tries it is failed, for finance');
select is((select last_error from public.payouts where id = '35035035-0000-4000-8000-0000000000ab'), 'account closed', 'with the reason');
select is(public.money_out_failed('payout', '35035035-0000-4000-8000-0000000000ab', 'again'), null, 'only a payout being sent can fail');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "35035035-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.money_out_failed('payout', '35035035-0000-4000-8000-0000000000ab', 'x')$$, '42501', null, 'only the server reports failures');
reset role;
select lives_ok($$select private.daily_reconciliation()$$, 'the daily reconciliation runs');

select * from finish();
rollback;
