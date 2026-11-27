begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

-- Cast: a sender (Adaeze, Okafor Foods) and a second sender (Bisi, Lekki Traders). The fee is on.
update public.settings set value = 'false' where key = 'first_trip_no_fee';
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at) values
  ('27272727-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adaeze@okaforfoods.ng', now(), '{"full_name": "Adaeze Okafor"}', now(), now()),
  ('27272727-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bisi@lekkitraders.ng', now(), '{"full_name": "Bisi Adeyemi"}', now(), now());
insert into public.organizations (id, kind, name) values
  ('27272727-0000-4000-8000-0000000000a1', 'shipper', 'Okafor Foods Ltd'),
  ('27272727-0000-4000-8000-0000000000a2', 'shipper', 'Lekki Traders');
insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver) values
  ('27272727-0000-4000-8000-0000000000a1', '27272727-0000-4000-8000-000000000001', 'owner', null, false),
  ('27272727-0000-4000-8000-0000000000a2', '27272727-0000-4000-8000-000000000002', 'owner', null, false);

create temp table ids (name text primary key, id uuid);
create temp table n (name text primary key, v bigint);
grant all on ids, n to authenticated, service_role;
insert into ids values
  ('lagos', (select id from public.cities where slug = 'lagos')),
  ('kano', (select id from public.cities where slug = 'kano')),
  ('flatbed', (select id from public.truck_types where code = 'flatbed_30t')),
  ('rice', (select id from public.goods_categories where code = 'rice_bags'));

create function pg_temp.stops() returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('city', (select id from ids where name = 'lagos'), 'address', 'Apapa port, Lagos'),
    jsonb_build_object('city', (select id from ids where name = 'kano'), 'address', 'Dawanau market, Kano', 'name', 'Amina Bello', 'phone', '+2348065550142'));
$$;
create function pg_temp.items() returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('goods', (select id from ids where name = 'rice'), 'description', 'Bags of rice', 'quantity', 600, 'unit', 'bags', 'unit_weight_kg', 50, 'value_kobo', 600000000));
$$;
create function pg_temp.escrow(p_load text) returns bigint language sql as $$
  select private.ledger_balance(private.ledger_account('escrow', null, (select id from ids where name = p_load)));
$$;
create function pg_temp.draft(p_org uuid) returns uuid language sql as $$
  select public.create_load(p_org, (select id from ids where name = 'flatbed'), now() + interval '1 day', now() + interval '1 day 6 hours', pg_temp.stops(), pg_temp.items());
$$;
grant execute on function pg_temp.stops(), pg_temp.items(), pg_temp.escrow(text), pg_temp.draft(uuid) to authenticated, service_role;

-- ---- Drafts (D049) ----------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'd1', pg_temp.draft('27272727-0000-4000-8000-0000000000a1');
insert into ids select 'd2', pg_temp.draft('27272727-0000-4000-8000-0000000000a1');
insert into ids select 'd3', pg_temp.draft('27272727-0000-4000-8000-0000000000a1');
insert into ids select 'single', pg_temp.draft('27272727-0000-4000-8000-0000000000a1');
insert into ids select 'old', pg_temp.draft('27272727-0000-4000-8000-0000000000a1');
select is((select status::text from public.loads where id = (select id from ids where name = 'd1')), 'draft', 'a saved booking is a draft: not placed, nothing held');
select is(public.load_pay_total((select id from ids where name = 'd1')), (select total_kobo from public.loads where id = (select id from ids where name = 'd1')),
  'the pay screen shows the price paying would take now');

reset role;
select is(pg_temp.escrow('d1'), 0::bigint, 'nothing is held for a draft');
update public.loads set pickup_from = now() - interval '2 days', pickup_until = now() - interval '1 day' where id = (select id from ids where name = 'old');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.request_load_payment((select id from ids where name = 'old'))$$, '22023', 'choose a new pick-up day', 'a draft whose day has passed needs a new day first');
select lives_ok($$select public.change_load_day((select id from ids where name = 'old'), now() + interval '2 days', now() + interval '2 days 6 hours')$$, 'the sender picks a new day for the draft');
select lives_ok($$select public.request_load_payment((select id from ids where name = 'old'))$$, 'then it can be paid');

-- Someone else can't see a price, save or pay another business's draft.
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok($$select public.load_pay_total((select id from ids where name = 'd1'))$$, '42501', null, 'another business cannot price this draft');
select throws_ok($$select public.request_load_payment((select id from ids where name = 'd1'))$$, '42501', null, 'or pay it');
select throws_ok($$select public.save_as_draft((select id from ids where name = 'old'))$$, '42501', null, 'or save it as a draft');

-- ---- Hosted checkout: failed, try again, save as draft (D048) ---------------------------------------
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'pay1', public.request_load_payment((select id from ids where name = 'single'));
select throws_ok($$select public.attach_checkout((select id from ids where name = 'pay1'), 'demo', 'demo-co-1', '/pay/demo/demo-co-1')$$, '42501', null, 'the browser cannot attach a checkout');
select throws_ok($$select public.fail_payment('demo-co-1')$$, '42501', null, 'or mark a payment failed');
reset role;
set local role service_role;
do $$ begin perform public.attach_checkout((select id from ids where name = 'pay1'), 'demo', 'demo-co-1', '/pay/demo/demo-co-1'); end $$;
select is((select checkout_url from public.payments where id = (select id from ids where name = 'pay1')), '/pay/demo/demo-co-1', 'the payment keeps its checkout page');
select is(public.fail_payment('demo-co-1'), 'failed', 'a checkout that took nothing fails');
reset role;
select is((select status::text from public.payments where id = (select id from ids where name = 'pay1')), 'failed', 'the payment is failed');
select is((select status::text from public.loads where id = (select id from ids where name = 'single')), 'awaiting_payment', 'the booking is still there');
select is(pg_temp.escrow('single'), 0::bigint, 'and nothing was taken');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'pay2', public.request_load_payment((select id from ids where name = 'single'));
select isnt((select id from ids where name = 'pay2'), (select id from ids where name = 'pay1'), 'Try again opens a new payment');
select lives_ok($$select public.save_as_draft((select id from ids where name = 'single'))$$, 'the sender saves it as a draft instead');
select is((select status::text from public.loads where id = (select id from ids where name = 'single')), 'draft', 'it is a draft again');
reset role;
select is((select status::text from public.payments where id = (select id from ids where name = 'pay2')), 'expired', 'its open payment closed');
-- Money that still arrives for the closed payment goes straight back.
set local role service_role;
do $$ begin perform public.attach_checkout((select id from ids where name = 'pay2'), 'demo', 'demo-co-2', '/pay/demo/demo-co-2'); end $$;
do $$ begin perform public.confirm_payment('demo-co-2', 'evt-late-1', (select amount_kobo from public.payments where id = (select id from ids where name = 'pay2'))); end $$;
reset role;
select is((select status::text from public.loads where id = (select id from ids where name = 'single')), 'draft', 'late money does not book a draft');
select is(pg_temp.escrow('single'), 0::bigint, 'nothing stays held');
select is((select sum(amount_kobo)::bigint from public.refunds where load_id = (select id from ids where name = 'single')),
  (select amount_kobo from public.payments where id = (select id from ids where name = 'pay2')), 'all of it is refunded');

-- ---- Pay for several (D049) -------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.request_batch_payment(array[(select id from ids where name = 'd1')])$$, '22023', 'choose two to ten drafts', 'several means two or more');
select throws_ok($$select public.request_batch_payment(array[(select id from ids where name = 'd1'), (select id from ids where name = 'd1')])$$, '22023', null, 'each draft once');
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000002", "role": "authenticated"}', true);
insert into ids select 'bisi', pg_temp.draft('27272727-0000-4000-8000-0000000000a2');
select throws_ok($$select public.request_batch_payment(array[(select id from ids where name = 'd1'), (select id from ids where name = 'd2')])$$, '42501', null, 'another business cannot pay these drafts');
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select throws_ok($$select public.request_batch_payment(array[(select id from ids where name = 'd1'), (select id from ids where name = 'bisi')])$$, '42501', null, 'one batch is one business');
insert into ids select 'batch', public.request_batch_payment(array[(select id from ids where name = 'd1'), (select id from ids where name = 'd2')]);
select is((select amount_kobo from public.payment_batches where id = (select id from ids where name = 'batch')),
  (select sum(total_kobo) from public.loads where id in ((select id from ids where name = 'd1'), (select id from ids where name = 'd2')))::bigint,
  'one checkout for the sum of the drafts');
select is((select count(*)::int from public.payments where batch_id = (select id from ids where name = 'batch')), 2, 'with one payment per load inside it');

reset role;
set local role service_role;
do $$ begin perform public.attach_batch_checkout((select id from ids where name = 'batch'), 'demo', 'demo-batch-1', '/pay/demo/demo-batch-1'); end $$;
select is((select count(*)::int from public.payments where batch_id = (select id from ids where name = 'batch') and provider_ref like 'demo-batch-1#%'), 2, 'each payment carries the batch reference');
-- Paid with ₦5,000 too much: both loads funded, each escrow exactly its total, the extra refunded.
select is(public.confirm_batch_payment('demo-batch-1', 'evt-batch-1', (select amount_kobo + 500000 from public.payment_batches where id = (select id from ids where name = 'batch'))), 'funded', 'the batch is paid');
select is(public.confirm_batch_payment('demo-batch-1', 'evt-batch-1', (select amount_kobo from public.payment_batches where id = (select id from ids where name = 'batch'))), 'duplicate', 'the same confirmation counts once');
reset role;
select is((select count(*)::int from public.loads where id in ((select id from ids where name = 'd1'), (select id from ids where name = 'd2')) and status = 'funded'), 2, 'both loads are booked and held on their own');
select is(pg_temp.escrow('d1'), (select total_kobo from public.loads where id = (select id from ids where name = 'd1')), 'the first escrow holds exactly its price');
select is(pg_temp.escrow('d2'), (select total_kobo from public.loads where id = (select id from ids where name = 'd2')), 'so does the second');
select is((select sum(amount_kobo)::bigint from public.refunds where load_id in ((select id from ids where name = 'd1'), (select id from ids where name = 'd2'))), 500000::bigint, 'the extra ₦5,000 is refunded');

-- A failed batch takes nothing and every draft stays waiting for payment.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000001", "role": "authenticated"}', true);
insert into ids select 'batch2', public.request_batch_payment(array[(select id from ids where name = 'd3'), (select id from ids where name = 'old')]);
reset role;
set local role service_role;
do $$ begin perform public.attach_batch_checkout((select id from ids where name = 'batch2'), 'demo', 'demo-batch-2', '/pay/demo/demo-batch-2'); end $$;
select is(public.fail_payment('demo-batch-2'), 'failed', 'a failed batch');
reset role;
select is((select count(*)::int from public.payments where batch_id = (select id from ids where name = 'batch2') and status = 'failed'), 2, 'fails every payment in it, with nothing taken');

-- A first load stays free on Try again (money review): the retry keeps the quote.
reset role;
update public.settings set value = 'true' where key = 'first_trip_no_fee';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000002", "role": "authenticated"}', true);
insert into ids select 'bisi_pay1', public.request_load_payment((select id from ids where name = 'bisi'));
select is((select fee_kobo from public.loads where id = (select id from ids where name = 'bisi')), 0::bigint, 'a first load has no service fee');
reset role;
set local role service_role;
do $$ begin perform public.attach_checkout((select id from ids where name = 'bisi_pay1'), 'demo', 'demo-bisi-1', '/pay/demo/demo-bisi-1'); end $$;
do $$ begin perform public.fail_payment('demo-bisi-1'); end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "27272727-0000-4000-8000-000000000002", "role": "authenticated"}', true);
insert into ids select 'bisi_pay2', public.request_load_payment((select id from ids where name = 'bisi'));
select is((select amount_kobo from public.payments where id = (select id from ids where name = 'bisi_pay2')),
  (select amount_kobo from public.payments where id = (select id from ids where name = 'bisi_pay1')), 'Try again asks for the same amount');
select is((select fee_kobo from public.loads where id = (select id from ids where name = 'bisi')), 0::bigint, 'and the first load is still free');
select is(public.load_pay_total((select id from ids where name = 'bisi')), (select total_kobo from public.loads where id = (select id from ids where name = 'bisi')), 'the pay screen shows that same amount');
select throws_ok($$select public.confirm_batch_payment('demo-batch-2', 'evt-x', 100)$$, '42501', null, 'the browser cannot confirm a batch');

select * from finish();
rollback;
