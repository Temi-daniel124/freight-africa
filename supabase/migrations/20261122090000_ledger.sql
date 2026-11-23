-- Phase 1 slice 7: the double-entry ledger (DATA-MODEL.md §8 ledger_accounts, ledger_transactions,
-- ledger_entries; SYSTEM-LOGIC.md §7.1; AGENT.md §3.2: kobo as bigint, every movement a balanced posting
-- made inside a Postgres function with an idempotency key). Money tables are never updated or deleted.

create type public.ledger_account_kind as enum (
  'provider_cash', 'escrow', 'owner_payable', 'agent_payable', 'shipper_refundable',
  'platform_revenue', 'processing_cost', 'promo_expense', 'dispute_reserve', 'owner_receivable'
);
create type public.ledger_transaction_kind as enum (
  'fund_load', 'advance', 'balance', 'commission', 'fee', 'refund', 'cancellation', 'waiting',
  'agent_share', 'promo', 'processing', 'adjustment'
);

-- ---------------------------------------------------------------------------------------------------
-- Accounts: platform accounts exist once; escrow and dispute reserve once per load; payables and
-- refundables once per organisation (agents get theirs with the agents table in Phase 6).
-- ---------------------------------------------------------------------------------------------------

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  kind public.ledger_account_kind not null,
  org_id uuid references public.organizations (id),
  -- The loads table arrives in Phase 3; the column is checked there.
  load_id uuid,
  currency text not null default 'NGN' check (currency = 'NGN'),
  created_at timestamptz not null default now(),
  constraint ledger_account_owner check (
    case kind
      when 'escrow' then load_id is not null and org_id is null
      when 'dispute_reserve' then load_id is not null and org_id is null
      when 'owner_payable' then org_id is not null and load_id is null
      when 'owner_receivable' then org_id is not null and load_id is null
      when 'shipper_refundable' then org_id is not null and load_id is null
      when 'agent_payable' then org_id is not null and load_id is null
      else org_id is null and load_id is null
    end
  )
);
create unique index ledger_accounts_platform on public.ledger_accounts (kind) where org_id is null and load_id is null;
create unique index ledger_accounts_per_load on public.ledger_accounts (kind, load_id) where load_id is not null;
create unique index ledger_accounts_per_org on public.ledger_accounts (kind, org_id) where org_id is not null;

-- The platform accounts, made once.
insert into public.ledger_accounts (kind) values ('provider_cash'), ('platform_revenue'), ('processing_cost'), ('promo_expense');

-- Cash, costs and money owed to us grow with debits; everything we owe (escrow, payables, refundables,
-- reserves) and revenue grows with credits.
create function private.debit_normal(p_kind public.ledger_account_kind) returns boolean language sql immutable set search_path = '' as $$
  select p_kind in ('provider_cash', 'processing_cost', 'promo_expense', 'owner_receivable');
$$;

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  kind public.ledger_transaction_kind not null,
  load_id uuid,
  trip_id uuid,
  -- One business event, one posting: a retry with the same key returns the first posting (e.g.
  -- 'payout:{trip}:advance', SYSTEM-LOGIC §7.2).
  idempotency_key text not null unique check (char_length(idempotency_key) between 3 and 200),
  memo text check (memo is null or char_length(memo) <= 300),
  created_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.ledger_transactions (id),
  account_id uuid not null references public.ledger_accounts (id),
  debit_kobo bigint not null default 0 check (debit_kobo >= 0),
  credit_kobo bigint not null default 0 check (credit_kobo >= 0),
  constraint one_side_only check ((debit_kobo > 0) <> (credit_kobo > 0))
);
create index ledger_entries_transaction on public.ledger_entries (transaction_id);
create index ledger_entries_account on public.ledger_entries (account_id);

-- Append-only: postings are corrected with a new adjustment, never edited (DATA-MODEL §0).
create function private.ledger_is_append_only() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'ledger rows cannot be changed or deleted' using errcode = '42501';
end;
$$;
create trigger ledger_transactions_append_only before update or delete on public.ledger_transactions for each row execute function private.ledger_is_append_only();
create trigger ledger_entries_append_only before update or delete on public.ledger_entries for each row execute function private.ledger_is_append_only();
create trigger ledger_transactions_no_truncate before truncate on public.ledger_transactions for each statement execute function private.ledger_is_append_only();
create trigger ledger_entries_no_truncate before truncate on public.ledger_entries for each statement execute function private.ledger_is_append_only();
create trigger ledger_accounts_no_truncate before truncate on public.ledger_accounts for each statement execute function private.ledger_is_append_only();

-- "Each transaction's debits equal its credits" (deferred, so all of a posting's lines are in first),
-- and every posting moves money between at least two accounts.
create function private.ledger_transaction_balances() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_debits numeric;
  v_credits numeric;
  v_lines int;
begin
  select coalesce(sum(debit_kobo), 0), coalesce(sum(credit_kobo), 0), count(*) into v_debits, v_credits, v_lines
  from public.ledger_entries where transaction_id = new.transaction_id;
  if v_debits <> v_credits or v_lines < 2 then
    raise exception 'unbalanced ledger posting' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.ledger_transaction_balances() from public;
create constraint trigger ledger_entries_balanced after insert on public.ledger_entries
  deferrable initially deferred for each row execute function private.ledger_transaction_balances();

-- "Escrow account balance for a load never goes below zero" (checked when the posting is complete).
create function private.ledger_escrow_not_negative() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.ledger_account_kind;
begin
  select kind into v_kind from public.ledger_accounts where id = new.account_id;
  if v_kind = 'escrow'
    and (select coalesce(sum(credit_kobo), 0) - coalesce(sum(debit_kobo), 0) from public.ledger_entries where account_id = new.account_id) < 0 then
    raise exception 'escrow cannot go below zero' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.ledger_escrow_not_negative() from public;
create constraint trigger ledger_entries_escrow_not_negative after insert on public.ledger_entries
  deferrable initially deferred for each row execute function private.ledger_escrow_not_negative();

-- ---------------------------------------------------------------------------------------------------
-- The one way money moves. Later slices' functions (fund_load, release_advance, release_balance…) call
-- these; nothing outside Postgres can post directly.
-- ---------------------------------------------------------------------------------------------------

-- The account for (kind, organisation, load), made on first use.
create function private.ledger_account(p_kind public.ledger_account_kind, p_org uuid default null, p_load uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select id into v_id from public.ledger_accounts
  where kind = p_kind and org_id is not distinct from p_org and load_id is not distinct from p_load;
  if v_id is null then
    insert into public.ledger_accounts (kind, org_id, load_id) values (p_kind, p_org, p_load)
    on conflict do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.ledger_accounts
      where kind = p_kind and org_id is not distinct from p_org and load_id is not distinct from p_load;
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function private.ledger_account(public.ledger_account_kind, uuid, uuid) from public;

-- Posts one balanced transaction. p_lines is a JSON array of {"account": uuid, "debit": kobo} or
-- {"account": uuid, "credit": kobo}; amounts are whole kobo (JSON integers), never fractions.
-- Idempotent: the same key with the same lines returns the first posting's id; the same key with
-- different lines is refused, because that means two different events claimed one key.
create function private.post_ledger(
  p_kind public.ledger_transaction_kind,
  p_idempotency_key text,
  p_lines jsonb,
  p_load uuid default null,
  p_trip uuid default null,
  p_memo text default null,
  p_approved_by uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_existing uuid;
  v_tx uuid;
  v_line jsonb;
  v_debit bigint;
  v_credit bigint;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_wanted jsonb;
  v_had jsonb;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'a posting needs at least two lines' using errcode = '22023';
  end if;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(v_line) <> 'object'
      or coalesce(jsonb_typeof(v_line -> 'account'), '') <> 'string'
      or (v_line ->> 'account') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or ((v_line ? 'debit') = (v_line ? 'credit'))
      or jsonb_typeof(coalesce(v_line -> 'debit', v_line -> 'credit')) <> 'number'
      or coalesce(v_line ->> 'debit', v_line ->> 'credit') !~ '^[1-9][0-9]{0,17}$' then
      raise exception 'each line is one account and a whole, positive kobo amount on one side' using errcode = '22023';
    end if;
    v_total_debit := v_total_debit + coalesce((v_line ->> 'debit')::numeric, 0);
    v_total_credit := v_total_credit + coalesce((v_line ->> 'credit')::numeric, 0);
  end loop;
  if v_total_debit <> v_total_credit then
    raise exception 'unbalanced ledger posting' using errcode = '23514';
  end if;

  -- The lines in a comparable form and order (account ids in lower case, amounts as numbers), for the
  -- idempotency check.
  select jsonb_agg(l order by l::text) into v_wanted
  from (
    select case when x ? 'debit' then jsonb_build_object('account', lower(x ->> 'account'), 'debit', (x ->> 'debit')::bigint)
                else jsonb_build_object('account', lower(x ->> 'account'), 'credit', (x ->> 'credit')::bigint) end as l
    from jsonb_array_elements(p_lines) x
  ) y;

  -- Two attempts with the same key queue here; the second sees the first.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  select id into v_existing from public.ledger_transactions where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    select jsonb_agg(l order by l::text) into v_had
    from (
      select case when e.debit_kobo > 0 then jsonb_build_object('account', e.account_id::text, 'debit', e.debit_kobo)
                  else jsonb_build_object('account', e.account_id::text, 'credit', e.credit_kobo) end as l
      from public.ledger_entries e where e.transaction_id = v_existing
    ) x;
    if v_had is distinct from v_wanted then
      raise exception 'this idempotency key was used for a different posting' using errcode = '23505';
    end if;
    return v_existing;
  end if;

  -- Two different events on one load (an advance and a refund, say) don't share an idempotency key, so
  -- lock every escrow account in this posting, in id order (no deadlocks), until commit. The escrow check
  -- below then sees the other posting's committed lines and can't be raced below zero.
  perform 1 from public.ledger_accounts a
  where a.kind = 'escrow' and a.id in (select (l ->> 'account')::uuid from jsonb_array_elements(p_lines) l)
  order by a.id
  for no key update;

  insert into public.ledger_transactions (kind, load_id, trip_id, idempotency_key, memo, created_by, approved_by)
  values (p_kind, p_load, p_trip, p_idempotency_key, p_memo, (select auth.uid()), p_approved_by)
  returning id into v_tx;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_debit := coalesce((v_line ->> 'debit')::bigint, 0);
    v_credit := coalesce((v_line ->> 'credit')::bigint, 0);
    insert into public.ledger_entries (transaction_id, account_id, debit_kobo, credit_kobo)
    values (v_tx, (v_line ->> 'account')::uuid, v_debit, v_credit);
  end loop;
  -- Check the money rules now rather than at commit, so the caller gets the error from this call (and
  -- return them to deferred, their normal state).
  set constraints public.ledger_entries_balanced, public.ledger_entries_escrow_not_negative immediate;
  set constraints public.ledger_entries_balanced, public.ledger_entries_escrow_not_negative deferred;
  return v_tx;
end;
$$;
revoke all on function private.post_ledger(public.ledger_transaction_kind, text, jsonb, uuid, uuid, text, uuid) from public;

-- An account's balance on its normal side, in kobo (escrow: what is still held).
create function private.ledger_balance(p_account uuid) returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case when private.debit_normal(a.kind) then e.debit_kobo - e.credit_kobo else e.credit_kobo - e.debit_kobo end), 0)::bigint
  from public.ledger_accounts a
  left join public.ledger_entries e on e.account_id = a.id
  where a.id = p_account
  group by a.id;
$$;
revoke all on function private.ledger_balance(uuid) from public;

-- ---------------------------------------------------------------------------------------------------
-- Reading: finance and super admins only (DATA-MODEL §12). No writes for anyone outside Postgres.
-- ---------------------------------------------------------------------------------------------------

alter table public.ledger_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;

create policy "ledger_accounts: finance read" on public.ledger_accounts for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])));
create policy "ledger_transactions: finance read" on public.ledger_transactions for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])));
create policy "ledger_entries: finance read" on public.ledger_entries for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])));

grant select on public.ledger_accounts, public.ledger_transactions, public.ledger_entries to authenticated;
grant select on public.ledger_accounts, public.ledger_transactions, public.ledger_entries to service_role;

-- Balances for the money pages (X-09, X-12): finance and super admins only.
create function public.ledger_account_balances()
returns table (account_id uuid, kind public.ledger_account_kind, org_id uuid, load_id uuid, balance_kobo bigint)
language sql stable security definer set search_path = '' as $$
  select a.id, a.kind, a.org_id, a.load_id, private.ledger_balance(a.id)
  from public.ledger_accounts a
  where public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])
  order by a.kind, a.created_at;
$$;
revoke all on function public.ledger_account_balances() from public;
grant execute on function public.ledger_account_balances() to authenticated;
