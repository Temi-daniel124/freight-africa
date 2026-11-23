begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- A truck owner's business, finance and operations staff, an ordinary user, and a load id (the loads
-- table arrives in Phase 3).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('ffffffff-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'segun@freight-africa.com', now(), '{"full_name": "Segun Ade"}', now(), now()),
  ('ffffffff-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kemi@freight-africa.com', now(), '{"full_name": "Kemi Ola"}', now(), now()),
  ('ffffffff-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'musa@example.com', now(), '{"full_name": "Musa Ibrahim"}', now(), now());
insert into public.staff_members (user_id, role) values
  ('ffffffff-0000-4000-8000-000000000001', 'finance'),
  ('ffffffff-0000-4000-8000-000000000002', 'operations');
insert into public.organizations (id, kind, name) values ('99999999-0000-4000-8000-000000000001', 'transporter', 'Musa Transport');
insert into public.organization_members (org_id, user_id, transporter_role) values ('99999999-0000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000003', 'owner');

select set_config('test.cash', (select id::text from public.ledger_accounts where kind = 'provider_cash'), true);
select set_config('test.escrow', private.ledger_account('escrow', null, '77777777-0000-4000-8000-000000000001')::text, true);
select set_config('test.payable', private.ledger_account('owner_payable', '99999999-0000-4000-8000-000000000001')::text, true);

-- Accounts.
select is((select count(*)::int from public.ledger_accounts where org_id is null and load_id is null), 4, 'the four platform accounts exist once');
select is(private.ledger_account('escrow', null, '77777777-0000-4000-8000-000000000001')::text, current_setting('test.escrow'), 'one escrow account per load, reused');
select throws_ok($$insert into public.ledger_accounts (kind) values ('escrow')$$, '23514', null, 'an escrow account belongs to a load');
select throws_ok($$insert into public.ledger_accounts (kind) values ('provider_cash')$$, '23505', null, 'there is only one provider cash account');

-- A balanced posting (SYSTEM-LOGIC §7.1, load funded: provider_cash debit, escrow credit).
select set_config('test.fund', private.post_ledger(
  'fund_load', 'payment:p1:fund',
  jsonb_build_array(jsonb_build_object('account', current_setting('test.cash'), 'debit', 105000000), jsonb_build_object('account', current_setting('test.escrow'), 'credit', 105000000)),
  '77777777-0000-4000-8000-000000000001'
)::text, true);
select is(private.ledger_balance(current_setting('test.escrow')::uuid), 105000000::bigint, 'escrow holds ₦1,050,000');
select is(private.ledger_balance(current_setting('test.cash')::uuid), 105000000::bigint, 'and the provider holds the cash');

-- Idempotency: one event, one posting.
select is(private.post_ledger(
  'fund_load', 'payment:p1:fund',
  jsonb_build_array(jsonb_build_object('account', current_setting('test.escrow'), 'credit', 105000000), jsonb_build_object('account', current_setting('test.cash'), 'debit', 105000000))
)::text, current_setting('test.fund'), 'repeating the same posting returns the first one');
select is((select count(*)::int from public.ledger_entries where transaction_id = current_setting('test.fund')::uuid), 2, 'and adds nothing');
select throws_ok(format($$select private.post_ledger('fund_load', 'payment:p1:fund', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 1), jsonb_build_object('account', %L, 'credit', 1)))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '23505', null, 'the same key for a different posting is refused');

-- Postings that are refused.
select throws_ok(format($$select private.post_ledger('adjustment', 'test:unbalanced', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 100), jsonb_build_object('account', %L, 'credit', 99)))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '23514', null, 'an unbalanced posting is refused');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:one-line', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 100)))$$, current_setting('test.cash')),
  '22023', null, 'a one-line posting is refused');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:fraction', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 100.5), jsonb_build_object('account', %L, 'credit', 100.5)))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '22023', null, 'fractions of a kobo are refused');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:zero', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 0), jsonb_build_object('account', %L, 'credit', 0)))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '22023', null, 'zero amounts are refused');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:negative', jsonb_build_array(jsonb_build_object('account', %L, 'debit', -5), jsonb_build_object('account', %L, 'credit', -5)))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '22023', null, 'negative amounts are refused');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:string', jsonb_build_array(jsonb_build_object('account', %L, 'debit', '100'), jsonb_build_object('account', %L, 'credit', '100')))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '22023', null, 'amounts written as text are refused');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:both', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 5, 'credit', 5), jsonb_build_object('account', %L, 'credit', 5)))$$, current_setting('test.cash'), current_setting('test.escrow')),
  '22023', null, 'a line with both a debit and a credit is refused');

-- Escrow never goes below zero; a real advance (§7.2) moves money from escrow to the owner.
select throws_ok(format($$select private.post_ledger('advance', 'payout:t1:advance-too-big', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 105000001), jsonb_build_object('account', %L, 'credit', 105000001)))$$, current_setting('test.escrow'), current_setting('test.payable')),
  '23514', null, 'more than escrow holds cannot be released');
select lives_ok(format($$select private.post_ledger('advance', 'payout:t1:advance', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 31500000), jsonb_build_object('account', %L, 'credit', 31500000)))$$, current_setting('test.escrow'), current_setting('test.payable')),
  'a 30%% advance is released');
select is(private.ledger_balance(current_setting('test.escrow')::uuid), 73500000::bigint, 'escrow keeps the rest');
select is(private.ledger_balance(current_setting('test.payable')::uuid), 31500000::bigint, 'and the owner is owed the advance');

-- Append-only.
select throws_ok($$update public.ledger_entries set debit_kobo = debit_kobo + 1$$, '42501', null, 'ledger entries cannot be changed');
select throws_ok($$delete from public.ledger_transactions$$, '42501', null, 'ledger postings cannot be deleted');

-- Who can read (DATA-MODEL §12: finance and super admins only) and write (nobody outside Postgres).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "ffffffff-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal1"}', true);
select is((select count(*)::int from public.ledger_entries), 0, 'a truck owner cannot read the ledger, even about his own money');
select throws_ok(format($$select private.post_ledger('adjustment', 'test:user', jsonb_build_array(jsonb_build_object('account', %L, 'debit', 1), jsonb_build_object('account', %L, 'credit', 1)))$$, current_setting('test.payable'), current_setting('test.cash')),
  '42501', null, 'nobody outside Postgres can post');
select throws_ok(format($$insert into public.ledger_entries (transaction_id, account_id, credit_kobo) values (%L, %L, 1000000)$$, current_setting('test.fund'), current_setting('test.payable')),
  '42501', null, 'or write ledger rows directly');

select set_config('request.jwt.claims', '{"sub": "ffffffff-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*)::int from public.ledger_entries), 0, 'operations staff cannot read the ledger');

select set_config('request.jwt.claims', '{"sub": "ffffffff-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*)::int from public.ledger_entries), 4, 'finance reads every entry');
select is((select balance_kobo from public.ledger_account_balances() where kind = 'escrow'), 73500000::bigint, 'and the balances');

select * from finish();
rollback;
