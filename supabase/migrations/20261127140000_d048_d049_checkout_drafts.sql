-- Combined brief slice 5c: hosted checkout (D048), drafts and Pay for several (D049).
-- Money rules (AGENT.md §3): kobo as bigint; money only moves through confirm_payment, which posts to the
-- ledger idempotently per provider event. A batch is one checkout for several loads: one payment per load
-- inside it, so each load's escrow, fee and refunds stay its own.

-- ---------------------------------------------------------------------------------------------------
-- Checkout fields and batches.
-- ---------------------------------------------------------------------------------------------------
create table public.payment_batches (
  id uuid primary key default gen_random_uuid(),
  shipper_org_id uuid not null references public.organizations (id),
  amount_kobo bigint not null check (amount_kobo > 0),
  provider text check (provider is null or provider in ('demo', 'bachs')),
  provider_ref text unique,
  checkout_url text check (checkout_url is null or checkout_url ~ '^(https://|/)'),
  status public.payment_status not null default 'pending',
  received_kobo bigint not null default 0 check (received_kobo >= 0),
  expires_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payment_batches_org on public.payment_batches (shipper_org_id, created_at desc);
alter table public.payment_batches enable row level security;
create policy "payment batches: sender money" on public.payment_batches for select to authenticated
  using ((select public.can_in_org(shipper_org_id, 'pay')) or (select public.can_in_org(shipper_org_id, 'see_money')));
create policy "payment batches: staff read" on public.payment_batches for select to authenticated using ((select public.is_staff()));
revoke all on public.payment_batches from anon, authenticated;
grant select on public.payment_batches to authenticated;
grant select, insert, update, delete on public.payment_batches to service_role;

-- Each confirmation of a batch counts once, like private.payment_events for single payments.
create table private.batch_events (
  provider_event_id text primary key,
  batch_id uuid not null references public.payment_batches (id),
  amount_kobo bigint not null,
  created_at timestamptz not null default now()
);

alter table public.payments
  add column checkout_url text check (checkout_url is null or checkout_url ~ '^(https://|/)'),
  add column batch_id uuid references public.payment_batches (id),
  add column failed_at timestamptz;
create index payments_batch on public.payments (batch_id) where batch_id is not null;

-- ---------------------------------------------------------------------------------------------------
-- The price a load would be paid at now (SYSTEM-LOGIC §3.1), shared by request_load_payment and the pay
-- screen. An offer keeps its total; if our price fell to or below it, it becomes a booking at our price;
-- if our price rose so far that the offer is under the new floor, the sender must choose again.
-- ---------------------------------------------------------------------------------------------------
create function private.load_price_now(p_load public.loads,
  out freight_kobo bigint, out fee_bps int, out fee_kobo bigint, out list_freight_kobo bigint, out offer_total_kobo bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_price record;
  v_split record;
  v_dropoffs int;
begin
  select count(*) - 1 into v_dropoffs from public.load_stops where load_id = p_load.id;
  select * into v_price from private.price(p_load.shipper_org_id, p_load.from_city_id, p_load.to_city_id, p_load.truck_type_id, v_dropoffs);
  if v_price.freight_kobo is null then
    raise exception 'we don''t cover this route yet' using errcode = 'P0002';
  end if;
  freight_kobo := v_price.freight_kobo;
  fee_bps := v_price.fee_bps;
  fee_kobo := v_price.fee_kobo;
  if p_load.offer_total_kobo is not null and p_load.offer_total_kobo < v_price.total_kobo then
    if p_load.offer_total_kobo < private.offer_floor(v_price.total_kobo) then
      raise exception 'our price changed: choose your offer again' using errcode = '22023';
    end if;
    select * into v_split from private.offer_split(p_load.offer_total_kobo, v_price.fee_bps);
    freight_kobo := v_split.freight_kobo;
    fee_kobo := v_split.fee_kobo;
    list_freight_kobo := v_price.freight_kobo;
    offer_total_kobo := p_load.offer_total_kobo;
  end if;
end;
$$;

-- P10 / P12b: what paying for this load would cost now (a draft is re-quoted when it is paid, D049).
create function public.load_pay_total(p_load uuid) returns bigint language plpgsql stable security definer set search_path = '' as $$
declare
  v_load public.loads;
  v_now record;
begin
  select * into v_load from public.loads where id = p_load;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'book') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- A load already waiting for payment keeps its quote (it counts towards the first-load rule itself).
  if v_load.status not in ('draft', 'expired') then
    return v_load.total_kobo;
  end if;
  select * into v_now from private.load_price_now(v_load);
  return v_now.freight_kobo + v_now.fee_kobo;
end;
$$;

create or replace function public.request_load_payment(p_load uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_load public.loads;
  v_now record;
  v_payment uuid;
begin
  select * into v_load from public.loads where id = p_load for update;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'pay') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_load.status = 'awaiting_payment' then
    -- A single checkout reuses its own open payment; a payment inside a batch belongs to that checkout.
    select id into v_payment from public.payments
    where load_id = p_load and purpose = 'load' and status = 'pending' and batch_id is null and expires_at > now()
    order by created_at desc limit 1;
    if v_payment is not null then
      return v_payment;
    end if;
    -- Try again after a failed or closed checkout: a new payment at the same quote (re-quoting here
    -- would count this very load against the first-load rule, money review). Open batch payments for it
    -- close; money still arriving for them funds the load once and the rest is refunded.
    if v_load.pickup_from < now() - interval '1 hour' then
      raise exception 'choose a new pick-up day' using errcode = '22023';
    end if;
    update public.payments set status = 'expired' where load_id = p_load and purpose = 'load' and status = 'pending' and batch_id is not null;
    insert into public.payments (purpose, shipper_org_id, load_id, amount_kobo, expires_at, created_by)
    values ('load', v_load.shipper_org_id, p_load, v_load.total_kobo,
      now() + make_interval(hours => (private.setting('payment_expiry_hours'))::int), v_user)
    returning id into v_payment;
    return v_payment;
  elsif v_load.status not in ('draft', 'expired') then
    raise exception 'this load is already paid for' using errcode = '22023';
  end if;
  -- D049: a draft keeps its day, but a day that has passed must be chosen again before paying.
  if v_load.pickup_from < now() - interval '1 hour' then
    raise exception 'choose a new pick-up day' using errcode = '22023';
  end if;
  select * into v_now from private.load_price_now(v_load);
  update public.loads set status = 'awaiting_payment', freight_kobo = v_now.freight_kobo, fee_bps = v_now.fee_bps, fee_kobo = v_now.fee_kobo,
    total_kobo = v_now.freight_kobo + v_now.fee_kobo, list_freight_kobo = v_now.list_freight_kobo, offer_total_kobo = v_now.offer_total_kobo,
    updated_at = now() where id = p_load;
  insert into public.payments (purpose, shipper_org_id, load_id, amount_kobo, expires_at, created_by)
  values ('load', v_load.shipper_org_id, p_load, v_now.freight_kobo + v_now.fee_kobo,
    now() + make_interval(hours => (private.setting('payment_expiry_hours'))::int), v_user)
  returning id into v_payment;
  return v_payment;
end;
$$;

-- P10c / P10 "Save as draft": a load waiting for its payment goes back to being a draft. Nothing is held
-- for a draft, so a load with any money in its escrow can't become one. Open payments close; money that
-- still arrives for them is refunded whole by confirm_payment (the load is no longer awaiting payment).
create function public.save_as_draft(p_load uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_load public.loads;
begin
  -- Check who is asking before taking any lock (money review).
  if not exists (select 1 from public.loads where id = p_load and public.can_in_org(shipper_org_id, 'book')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_load from public.loads where id = p_load for update;
  perform 1 from public.payments where load_id = p_load for update;
  if v_load.status = 'draft' then
    return;
  end if;
  if v_load.status not in ('awaiting_payment', 'expired') then
    raise exception 'only an unpaid booking can be a draft' using errcode = '22023';
  end if;
  if private.ledger_balance(private.ledger_account('escrow', null, p_load)) > 0 then
    raise exception 'part of this booking is paid' using errcode = '22023';
  end if;
  update public.payments set status = 'expired' where load_id = p_load and purpose = 'load' and status = 'pending';
  update public.loads set status = 'draft', updated_at = now() where id = p_load;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- P15c Pay for several: one checkout, one payment per load. Every load must belong to the same business
-- and be unpaid. Each load is priced exactly as a single payment would be (request_load_payment), so the
-- first-load rule and offers apply load by load.
-- ---------------------------------------------------------------------------------------------------
create function public.request_batch_payment(p_loads uuid[]) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_org uuid;
  v_n int := coalesce(array_length(p_loads, 1), 0);
  v_load public.loads;
  v_batch uuid;
  v_payment uuid;
  v_total bigint := 0;
  v_id uuid;
begin
  if v_n < 2 or v_n > 10 or (select count(distinct x) from unnest(p_loads) x) <> v_n then
    raise exception 'choose two to ten drafts' using errcode = '22023';
  end if;
  -- Check who is asking before taking any lock, then lock the loads in one order (by id) and then their
  -- payments (money review: one lock order).
  if (select count(*) from public.loads where id = any (p_loads)) <> v_n
    or (select count(distinct shipper_org_id) from public.loads where id = any (p_loads)) <> 1
    or not public.can_in_org((select shipper_org_id from public.loads where id = p_loads[1]), 'pay') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  for v_load in select * from public.loads where id = any (p_loads) order by id for update loop
    if v_org is null then
      v_org := v_load.shipper_org_id;
    elsif v_org <> v_load.shipper_org_id then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end loop;
  if v_org is null or (select count(*) from public.loads where id = any (p_loads)) <> v_n or not public.can_in_org(v_org, 'pay') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform 1 from public.payments where load_id = any (p_loads) order by id for update;
  insert into public.payment_batches (shipper_org_id, amount_kobo, expires_at, created_by)
  values (v_org, 1, now() + make_interval(hours => (private.setting('payment_expiry_hours'))::int), v_user)
  returning id into v_batch;
  foreach v_id in array p_loads loop
    -- An open single payment closes; if it is paid anyway, it funds the load and the batch's share is refunded.
    update public.payments set status = 'expired' where load_id = v_id and purpose = 'load' and status = 'pending';
    v_payment := public.request_load_payment(v_id);
    update public.payments set batch_id = v_batch where id = v_payment;
    v_total := v_total + (select amount_kobo from public.payments where id = v_payment);
  end loop;
  update public.payment_batches set amount_kobo = v_total where id = v_batch;
  return v_batch;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Server only: the provider's hosted checkout for a payment or a batch (D048).
-- ---------------------------------------------------------------------------------------------------
create function public.attach_checkout(p_payment uuid, p_provider text, p_ref text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set provider = p_provider, provider_ref = p_ref, checkout_url = p_url
  where id = p_payment and provider_ref is null and batch_id is null;
end;
$$;

-- Each payment inside the batch gets its own reference (the batch's plus its id), so confirm_payment
-- records and posts it like any single payment.
create function public.attach_batch_checkout(p_batch uuid, p_provider text, p_ref text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_batches set provider = p_provider, provider_ref = p_ref, checkout_url = p_url
  where id = p_batch and provider_ref is null;
  if found then
    update public.payments set provider = p_provider, provider_ref = p_ref || '#' || id::text where batch_id = p_batch and provider_ref is null;
  end if;
end;
$$;

-- Server only (webhook or the demo checkout): the money for a batch arrived. Idempotent per provider
-- event. The amount is shared out in order, each payment getting what it still needs; anything over the
-- batch total goes to the last payment, where confirm_payment refunds the surplus.
create function public.confirm_batch_payment(p_provider_ref text, p_event_id text, p_amount_kobo bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_batch public.payment_batches;
  v_left bigint := p_amount_kobo;
  v_pay record;
  v_give bigint;
  v_last uuid;
  v_status text;
  v_all text := 'funded';
begin
  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  select * into v_batch from public.payment_batches where provider_ref = p_provider_ref for update;
  if v_batch.id is null then
    raise exception 'unknown payment' using errcode = 'P0002';
  end if;
  if exists (select 1 from private.batch_events where provider_event_id = p_event_id) then
    return 'duplicate';
  end if;
  -- The batch, then its loads in id order, then their payments: the same order as request_batch_payment.
  perform 1 from public.loads where id in (select load_id from public.payments where batch_id = v_batch.id) order by id for update;
  perform 1 from public.payments where batch_id = v_batch.id order by id for update;
  insert into private.batch_events (provider_event_id, batch_id, amount_kobo) values (p_event_id, v_batch.id, p_amount_kobo);
  update public.payment_batches set received_kobo = received_kobo + p_amount_kobo,
    status = case when received_kobo + p_amount_kobo >= amount_kobo then 'received'::public.payment_status else status end
  where id = v_batch.id;
  select id into v_last from public.payments where batch_id = v_batch.id order by created_at desc, id desc limit 1;
  for v_pay in select id, provider_ref, amount_kobo, received_kobo from public.payments where batch_id = v_batch.id order by created_at, id loop
    v_give := case when v_pay.id = v_last then v_left else least(v_left, greatest(v_pay.amount_kobo - v_pay.received_kobo, 0)) end;
    if v_give > 0 then
      v_status := public.confirm_payment(v_pay.provider_ref, p_event_id || ':' || v_pay.id::text, v_give);
      v_left := v_left - v_give;
      if v_status <> 'funded' then
        v_all := 'partial';
      end if;
    elsif v_pay.received_kobo < v_pay.amount_kobo then
      v_all := 'partial';
    end if;
  end loop;
  return v_all;
end;
$$;

-- Server only: the provider says a checkout failed or was abandoned (P10c "nothing was taken"). Only a
-- payment that received nothing is marked failed; the load stays waiting for payment ("Your booking is
-- still here"), and Try again opens a new payment.
create function public.fail_payment(p_provider_ref text) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_batch uuid;
  v_received bigint;
  v_n int;
begin
  select id, received_kobo into v_batch, v_received from public.payment_batches where provider_ref = p_provider_ref for update;
  if v_batch is not null then
    -- Part of the batch already arrived: it isn't a failed checkout, whatever the provider says.
    if v_received > 0 then
      return 'ignored';
    end if;
    perform 1 from public.payments where batch_id = v_batch for update;
    update public.payment_batches set status = 'failed' where id = v_batch and status = 'pending' and received_kobo = 0;
    update public.payments set status = 'failed', failed_at = now() where batch_id = v_batch and status = 'pending' and received_kobo = 0;
    get diagnostics v_n = row_count;
  else
    update public.payments set status = 'failed', failed_at = now() where provider_ref = p_provider_ref and status = 'pending' and received_kobo = 0;
    get diagnostics v_n = row_count;
    if v_n = 0 and not exists (select 1 from public.payments where provider_ref = p_provider_ref) then
      raise exception 'unknown payment' using errcode = 'P0002';
    end if;
  end if;
  return case when v_n > 0 then 'failed' else 'ignored' end;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------------------------------
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.load_pay_total(uuid)', 'public.request_load_payment(uuid)', 'public.save_as_draft(uuid)', 'public.request_batch_payment(uuid[])'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'public.attach_checkout(uuid, text, text, text)', 'public.attach_batch_checkout(uuid, text, text, text)',
    'public.confirm_batch_payment(text, text, bigint)', 'public.fail_payment(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  execute 'revoke all on function private.load_price_now(public.loads) from public';
end;
$$;
