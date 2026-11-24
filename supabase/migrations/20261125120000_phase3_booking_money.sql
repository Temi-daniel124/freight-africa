-- Phase 3: booking and money (DATA-MODEL §6–§8, SYSTEM-LOGIC §3, §4, §7; D009, D019, D039, D046).
-- Prices, loads and their stops, offers and counter-offers, payments into escrow, trips, releases at
-- loading and at delivery, cancellations, refunds and payouts. Every money movement is a balanced,
-- idempotent posting through private.post_ledger (Phase 1). Drivers never see money (D003).

create type public.load_status as enum ('draft', 'awaiting_payment', 'funded', 'matched', 'cancelled', 'expired', 'refunded');
create type public.offer_kind as enum ('accept', 'counter');
create type public.offer_status as enum ('pending', 'awaiting_top_up', 'accepted', 'declined', 'expired', 'withdrawn');
create type public.trip_status as enum ('assigned', 'to_pickup', 'at_pickup', 'loading', 'loaded', 'in_transit', 'arrived', 'delivered', 'delivered_with_exception', 'closed', 'cancelled', 'transloading');
create type public.payment_status as enum ('pending', 'received', 'partially_refunded', 'refunded', 'expired', 'failed');
create type public.payment_purpose as enum ('load', 'top_up', 'waiting_charge', 'cancellation_fee');
create type public.payout_kind as enum ('advance', 'balance', 'cancellation_fee', 'waiting_charge', 'agent_share', 'transload_share');
create type public.payout_status as enum ('queued', 'awaiting_approval', 'processing', 'paid', 'failed', 'held', 'reversed');
create type public.refund_status as enum ('queued', 'awaiting_approval', 'processing', 'paid', 'failed');

-- ---------------------------------------------------------------------------------------------------
-- Settings for D009 (fees and commission) that Phase 1 did not seed.
-- ---------------------------------------------------------------------------------------------------
insert into public.settings (key, value, is_money, description) values
  ('shipper_fee_bps', '[{"from": 1, "bps": 300}, {"from": 6, "bps": 200}, {"from": 16, "bps": 150}]', true, 'Sender service fee by loads funded this calendar month, in basis points (D009).'),
  ('commission_bps', '{"new": 500, "established": 500, "gold": 400}', true, 'Truck owner commission by tier, in basis points (D009).'),
  ('first_trip_no_fee', 'true', true, 'A sender''s first load has no service fee (D009 launch offer).'),
  ('first_trips_no_commission', '3', true, 'A truck owner''s first trips with no commission (D009 launch offer).')
on conflict (key) do nothing;


-- ---------------------------------------------------------------------------------------------------
-- Lane prices: direction matters (backhaul is cheaper). Public read; staff change them.
-- ---------------------------------------------------------------------------------------------------
create table public.lane_prices (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid not null references public.corridors (id),
  from_city_id uuid not null references public.cities (id),
  to_city_id uuid not null references public.cities (id),
  truck_type_id uuid not null references public.truck_types (id),
  base_kobo bigint not null check (base_kobo > 0),
  per_km_kobo bigint not null default 0 check (per_km_kobo >= 0),
  min_kobo bigint not null check (min_kobo > 0),
  multiplier_bps int not null default 10000 check (multiplier_bps between 5000 and 30000),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  check (from_city_id <> to_city_id)
);
create unique index lane_prices_current on public.lane_prices (from_city_id, to_city_id, truck_type_id) where valid_until is null;
alter table public.lane_prices enable row level security;
create policy "lane prices: anyone reads" on public.lane_prices for select to anon, authenticated using (true);
revoke all on public.lane_prices from anon, authenticated;
grant select on public.lane_prices to anon, authenticated;

-- Launch prices (founder to confirm with the competitive rule, D009): per truck type, the lane's base
-- for the outbound direction and 80% back (backhaul).
insert into public.lane_prices (corridor_id, from_city_id, to_city_id, truck_type_id, base_kobo, per_km_kobo, min_kobo)
select c.id, d.from_id, d.to_id, t.id,
  (round(c.distance_km * tt.per_km * d.factor / 100000.0) * 100000)::bigint,
  (round(tt.per_km * 1.4 / 1000.0) * 1000)::bigint,
  (round(c.distance_km * tt.per_km * d.factor * 0.6 / 100000.0) * 100000)::bigint
from public.corridors c
cross join lateral (values (c.city_a_id, c.city_b_id, 1.0), (c.city_b_id, c.city_a_id, 0.8)) as d(from_id, to_id, factor)
cross join (values ('flatbed_30t', 180000), ('covered_20t', 160000), ('container_40ft', 190000), ('tipper', 150000), ('livestock', 170000), ('tanker', 200000)) as tt(code, per_km)
join public.truck_types t on t.code = tt.code;

-- ---------------------------------------------------------------------------------------------------
-- Loads and stops.
-- ---------------------------------------------------------------------------------------------------
create function private.new_ref() returns text language plpgsql volatile set search_path = '' as $$
declare
  v_ref text;
begin
  loop
    v_ref := 'FA-' || (
      select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, n) % 31), 1), '' order by n)
      from (select extensions.gen_random_bytes(5) as b) r, generate_series(0, 4) as n
    );
    exit when not exists (select 1 from public.loads where ref = v_ref);
  end loop;
  return v_ref;
end;
$$;

create table public.loads (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  shipper_org_id uuid not null references public.organizations (id),
  created_by uuid references public.profiles (id) on delete set null,
  corridor_id uuid references public.corridors (id),
  from_city_id uuid not null references public.cities (id),
  to_city_id uuid not null references public.cities (id),
  goods_category_id uuid not null references public.goods_categories (id),
  goods_description text check (goods_description is null or char_length(goods_description) <= 120),
  -- D046: the weight may be unknown; then a rough amount; livestock gives a head count.
  weight_kg int check (weight_kg is null or weight_kg between 1 and 60000),
  quantity int check (quantity is null or quantity between 1 and 1000000),
  quantity_unit text check (quantity_unit is null or quantity_unit in ('bags', 'cartons', 'pieces', 'drums', 'tonnes', 'head')),
  declared_value_kobo bigint not null default 0 check (declared_value_kobo >= 0),
  truck_type_id uuid not null references public.truck_types (id),
  pickup_from timestamptz not null,
  pickup_until timestamptz not null,
  freight_kobo bigint not null check (freight_kobo > 0),
  fee_bps int not null check (fee_bps between 0 and 2000),
  fee_kobo bigint not null check (fee_kobo >= 0),
  total_kobo bigint not null check (total_kobo > 0),
  status public.load_status not null default 'draft',
  funded_at timestamptz,
  matched_at timestamptz,
  no_truck_decision_due_at timestamptz,
  cancelled_reason text check (cancelled_reason is null or char_length(cancelled_reason) <= 300),
  notes_for_driver text check (notes_for_driver is null or char_length(notes_for_driver) <= 300),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pickup_until > pickup_from),
  check (total_kobo = freight_kobo + fee_kobo),
  check (from_city_id <> to_city_id),
  check ((quantity is null) = (quantity_unit is null)),
  check (weight_kg is not null or quantity is not null or quantity_unit is null)
);
create index loads_shipper on public.loads (shipper_org_id, created_at desc);
create index loads_status on public.loads (status, pickup_from);

create table public.load_stops (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references public.loads (id) on delete cascade,
  seq int not null check (seq between 0 and 4),
  kind text not null check (kind in ('pickup', 'dropoff')),
  city_id uuid not null references public.cities (id),
  address_text text not null check (char_length(address_text) between 3 and 200),
  location extensions.geography(Point, 4326),
  contact_name text check (contact_name is null or char_length(contact_name) <= 80),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'pending' check (status in ('pending', 'approaching', 'arrived', 'completed', 'completed_with_exception')),
  unique (load_id, seq),
  check ((seq = 0) = (kind = 'pickup'))
);

-- ---------------------------------------------------------------------------------------------------
-- Offers, payments, trips, payouts, refunds.
-- ---------------------------------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  purpose public.payment_purpose not null,
  shipper_org_id uuid not null references public.organizations (id),
  load_id uuid not null references public.loads (id),
  offer_id uuid,
  amount_kobo bigint not null check (amount_kobo > 0),
  provider text check (provider is null or provider in ('demo', 'bachs')),
  provider_ref text unique,
  virtual_account_number text check (virtual_account_number is null or virtual_account_number ~ '^[0-9]{10}$'),
  virtual_account_bank text,
  expires_at timestamptz not null,
  status public.payment_status not null default 'pending',
  received_kobo bigint not null default 0 check (received_kobo >= 0),
  received_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payments_load on public.payments (load_id, created_at desc);
-- Each confirmation from the provider counts once (a webhook retried or a demo button pressed twice).
create table private.payment_events (
  provider_event_id text primary key,
  payment_id uuid not null references public.payments (id),
  amount_kobo bigint not null,
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references public.loads (id),
  transporter_org_id uuid not null references public.organizations (id),
  truck_id uuid references public.trucks (id),
  driver_id uuid references public.profiles (id),
  kind public.offer_kind not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  status public.offer_status not null default 'pending',
  expires_at timestamptz,
  top_up_payment_id uuid references public.payments (id),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index offers_one_counter on public.offers (load_id, transporter_org_id) where kind = 'counter';
alter table public.payments add constraint payments_offer_fk foreign key (offer_id) references public.offers (id);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  load_id uuid not null references public.loads (id),
  transporter_org_id uuid not null references public.organizations (id),
  truck_id uuid not null references public.trucks (id),
  driver_id uuid references public.profiles (id),
  freight_kobo bigint not null check (freight_kobo > 0),
  commission_bps int not null check (commission_bps between 0 and 2000),
  commission_kobo bigint not null check (commission_kobo >= 0),
  advance_bps int not null check (advance_bps between 0 and 10000),
  advance_kobo bigint not null check (advance_kobo >= 0),
  status public.trip_status not null default 'assigned',
  -- D046: what the driver confirmed at loading (may correct the sender's weight or amount).
  loaded_weight_kg int check (loaded_weight_kg is null or loaded_weight_kg between 1 and 60000),
  loaded_quantity int check (loaded_quantity is null or loaded_quantity > 0),
  last_location extensions.geography(Point, 4326),
  last_ping_at timestamptz,
  eta_at timestamptz,
  loaded_at timestamptz,
  delivered_at timestamptz,
  auto_release_at timestamptz,
  status_changed_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (advance_kobo + commission_kobo <= freight_kobo)
);
create unique index trips_one_live_per_load on public.trips (load_id) where status not in ('cancelled', 'closed', 'transloading');
create index trips_org on public.trips (transporter_org_id, created_at desc);
create index trips_driver on public.trips (driver_id, created_at desc);
create index trips_truck on public.trips (truck_id, created_at desc);

create table public.trip_events (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips (id),
  type text not null check (char_length(type) between 2 and 60),
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_kind text not null check (actor_kind in ('driver', 'owner', 'shipper', 'receiver', 'pickup_contact', 'staff', 'system')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index trip_events_trip on public.trip_events (trip_id, created_at);
create trigger trip_events_append_only before update or delete on public.trip_events for each row execute function private.ledger_is_append_only();

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  kind public.payout_kind not null,
  org_id uuid not null references public.organizations (id),
  trip_id uuid references public.trips (id),
  bank_account_id uuid references public.bank_accounts (id),
  amount_kobo bigint not null check (amount_kobo > 0),
  ledger_transaction_id uuid not null references public.ledger_transactions (id),
  status public.payout_status not null default 'queued',
  provider_ref text,
  idempotency_key text not null unique,
  attempts int not null default 0,
  last_error text,
  approved_by uuid references public.profiles (id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references public.loads (id),
  shipper_org_id uuid not null references public.organizations (id),
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text not null check (char_length(reason) between 3 and 300),
  ledger_transaction_id uuid not null references public.ledger_transactions (id),
  status public.refund_status not null default 'queued',
  provider_ref text,
  idempotency_key text not null unique,
  requested_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------------
-- Pricing (SYSTEM-LOGIC §3.1; D009).
-- ---------------------------------------------------------------------------------------------------
create function private.round_to(p_value numeric, p_step bigint) returns bigint language sql immutable set search_path = '' as $$
  select (round(p_value / p_step) * p_step)::bigint;
$$;

-- The sender's fee rate for their next funded load this calendar month (Lagos time), 0 on their first.
create function private.shipper_fee_bps(p_org uuid) returns int language plpgsql stable security definer set search_path = '' as $$
declare
  v_month int;
  v_ever int;
  v_bps int := 300;
  v_tier jsonb;
begin
  -- A load being paid for counts too, so two first loads paid at once don't both skip the fee (review).
  select count(*) into v_ever from public.loads where shipper_org_id = p_org and (funded_at is not null or status = 'awaiting_payment');
  if v_ever = 0 and coalesce((private.setting('first_trip_no_fee'))::boolean, true) then
    return 0;
  end if;
  select count(*) into v_month from public.loads
  where shipper_org_id = p_org and funded_at >= date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  for v_tier in select * from jsonb_array_elements(coalesce(private.setting('shipper_fee_bps'), '[{"from":1,"bps":300}]')) loop
    if v_month + 1 >= (v_tier ->> 'from')::int then
      v_bps := (v_tier ->> 'bps')::int;
    end if;
  end loop;
  return v_bps;
end;
$$;

-- freight, fee and total for a lane and truck type, or nothing when the lane isn't covered.
create function private.price(p_org uuid, p_from uuid, p_to uuid, p_truck_type uuid, p_dropoffs int)
returns table (corridor_id uuid, freight_kobo bigint, fee_bps int, fee_kobo bigint, total_kobo bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lane public.lane_prices;
  v_freight bigint;
  v_fee_bps int;
  v_fee bigint;
begin
  select * into v_lane from public.lane_prices
  where from_city_id = p_from and to_city_id = p_to and truck_type_id = p_truck_type and valid_until is null;
  if v_lane.id is null then
    return;
  end if;
  v_freight := private.round_to(
    greatest(v_lane.min_kobo, v_lane.base_kobo + greatest(0, coalesce(p_dropoffs, 1) - 1) * (private.setting('extra_stop_kobo'))::bigint)
      * v_lane.multiplier_bps / 10000.0,
    100000);
  v_fee_bps := private.shipper_fee_bps(p_org);
  v_fee := private.round_to(v_freight * v_fee_bps / 10000.0, 10000);
  return query select v_lane.corridor_id, v_freight, v_fee_bps, v_fee, v_freight + v_fee;
end;
$$;

-- S-02 instant quote for a sender (anyone in the business may look).
create function public.quote_load(p_org uuid, p_from uuid, p_to uuid, p_truck_type uuid, p_dropoffs int default 1)
returns table (freight_kobo bigint, fee_bps int, fee_kobo bigint, total_kobo bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_in_org(p_org, 'book') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select p.freight_kobo, p.fee_bps, p.fee_kobo, p.total_kobo from private.price(p_org, p_from, p_to, p_truck_type, p_dropoffs) p;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Post a load (S-02; D046). p_stops: [{"city": uuid, "address": text, "name": text, "phone": "+234…"}],
-- the first is the pickup and the rest (1 to 4) are drop-offs.
-- ---------------------------------------------------------------------------------------------------
create function public.create_load(
  p_org uuid, p_goods uuid, p_description text, p_truck_type uuid,
  p_weight_kg int, p_quantity int, p_quantity_unit text, p_declared_value_kobo bigint,
  p_pickup_from timestamptz, p_pickup_until timestamptz, p_stops jsonb, p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
  v_price record;
  v_count int := jsonb_array_length(coalesce(p_stops, '[]'::jsonb));
  v_from uuid;
  v_to uuid;
  v_livestock boolean;
  v_type public.truck_types;
  v_stop jsonb;
  v_i int := 0;
begin
  if not public.can_in_org(p_org, 'book') or not exists (select 1 from public.organizations where id = p_org and kind = 'shipper') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_count < 2 or v_count > 1 + (private.setting('max_dropoffs'))::int then
    raise exception 'a pickup and one to four drop-offs' using errcode = '22023';
  end if;
  v_from := (p_stops -> 0 ->> 'city')::uuid;
  v_to := (p_stops -> (v_count - 1) ->> 'city')::uuid;
  select * into v_type from public.truck_types where id = p_truck_type and active;
  if v_type.id is null then
    raise exception 'unknown truck type' using errcode = '22023';
  end if;
  select g.code = 'livestock' into v_livestock from public.goods_categories g where g.id = p_goods and not g.is_banned;
  if v_livestock is null then
    raise exception 'unknown goods' using errcode = '22023';
  end if;
  -- D046: livestock asks how many animals instead of the weight; others give tonnes, or a rough amount.
  if v_livestock and (p_quantity is null or p_quantity_unit is distinct from 'head') then
    raise exception 'how many animals' using errcode = '22023';
  end if;
  if not v_livestock and p_quantity_unit = 'head' then
    raise exception 'head counts are for livestock' using errcode = '22023';
  end if;
  if p_weight_kg is not null and p_weight_kg > v_type.capacity_kg_max then
    raise exception 'too heavy for that truck type' using errcode = '22023';
  end if;
  if p_pickup_until <= p_pickup_from or p_pickup_from < now() - interval '1 hour' then
    raise exception 'choose a loading time from now on' using errcode = '22023';
  end if;
  select * into v_price from private.price(p_org, v_from, v_to, p_truck_type, v_count - 1);
  if v_price.freight_kobo is null then
    raise exception 'we don''t cover this route yet' using errcode = 'P0002';
  end if;
  -- Every drop-off is on the priced corridor: its end cities or a town it passes through (review).
  if exists (
    select 1 from jsonb_array_elements(p_stops) st
    join public.cities ci on ci.id = (st ->> 'city')::uuid
    join public.corridors co on co.id = v_price.corridor_id
    where ci.id not in (co.city_a_id, co.city_b_id) and not (ci.name = any (co.via))
  ) then
    raise exception 'every stop must be on the route' using errcode = '22023';
  end if;
  insert into public.loads (ref, shipper_org_id, created_by, corridor_id, from_city_id, to_city_id, goods_category_id, goods_description,
    weight_kg, quantity, quantity_unit, declared_value_kobo, truck_type_id, pickup_from, pickup_until,
    freight_kobo, fee_bps, fee_kobo, total_kobo, notes_for_driver, is_demo)
  values (private.new_ref(), p_org, v_user, v_price.corridor_id, v_from, v_to, p_goods, nullif(btrim(p_description), ''),
    p_weight_kg, p_quantity, p_quantity_unit, coalesce(p_declared_value_kobo, 0), p_truck_type, p_pickup_from, p_pickup_until,
    v_price.freight_kobo, v_price.fee_bps, v_price.fee_kobo, v_price.total_kobo, nullif(btrim(p_notes), ''),
    coalesce((select is_demo from public.organizations where id = p_org), false))
  returning id into v_id;
  for v_stop in select * from jsonb_array_elements(p_stops) loop
    insert into public.load_stops (load_id, seq, kind, city_id, address_text, contact_name, contact_phone)
    values (v_id, v_i, case when v_i = 0 then 'pickup' else 'dropoff' end, (v_stop ->> 'city')::uuid, btrim(v_stop ->> 'address'),
      nullif(btrim(v_stop ->> 'name'), ''), nullif(btrim(v_stop ->> 'phone'), ''));
    v_i := v_i + 1;
  end loop;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Paying: the sender asks to pay; the server gets a one-time account from the PaymentProvider and
-- attaches it; the provider's confirmation funds the load (escrow).
-- ---------------------------------------------------------------------------------------------------
create function public.request_load_payment(p_load uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_load public.loads;
  v_price record;
  v_payment uuid;
  v_dropoffs int;
begin
  select * into v_load from public.loads where id = p_load for update;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'pay') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_load.status = 'awaiting_payment' then
    select id into v_payment from public.payments where load_id = p_load and purpose = 'load' and status = 'pending' and expires_at > now() order by created_at desc limit 1;
    if v_payment is not null then
      return v_payment;
    end if;
  elsif v_load.status not in ('draft', 'expired') then
    raise exception 'this load is already paid for' using errcode = '22023';
  end if;
  -- Prices are recomputed when paying (SYSTEM-LOGIC §3.1).
  select count(*) - 1 into v_dropoffs from public.load_stops where load_id = p_load;
  select * into v_price from private.price(v_load.shipper_org_id, v_load.from_city_id, v_load.to_city_id, v_load.truck_type_id, v_dropoffs);
  if v_price.freight_kobo is null then
    raise exception 'we don''t cover this route yet' using errcode = 'P0002';
  end if;
  update public.loads set status = 'awaiting_payment', freight_kobo = v_price.freight_kobo, fee_bps = v_price.fee_bps, fee_kobo = v_price.fee_kobo,
    total_kobo = v_price.total_kobo, updated_at = now() where id = p_load;
  insert into public.payments (purpose, shipper_org_id, load_id, amount_kobo, expires_at, created_by)
  values ('load', v_load.shipper_org_id, p_load, v_price.total_kobo, now() + make_interval(hours => (private.setting('payment_expiry_hours'))::int), v_user)
  returning id into v_payment;
  return v_payment;
end;
$$;

-- Server only: the one-time account the provider gave for this payment.
create function public.attach_collection(p_payment uuid, p_provider text, p_ref text, p_account text, p_bank text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set provider = p_provider, provider_ref = p_ref, virtual_account_number = p_account, virtual_account_bank = p_bank
  where id = p_payment and provider_ref is null;
end;
$$;

-- Server only (webhook or the demo payer): money arrived for a collection account. Idempotent per
-- provider event. Every naira goes into the load's escrow first; a funded load's surplus, or money for a
-- load that can no longer be funded, moves to the sender's refundable balance and a refund is queued.
create function public.confirm_payment(p_provider_ref text, p_event_id text, p_amount_kobo bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_pay public.payments;
  v_load public.loads;
  v_escrow uuid;
  v_held bigint;
  v_needed bigint;
  v_extra bigint := 0;
  v_tx uuid;
begin
  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  select * into v_pay from public.payments where provider_ref = p_provider_ref for update;
  if v_pay.id is null then
    raise exception 'unknown payment' using errcode = 'P0002';
  end if;
  if exists (select 1 from private.payment_events where provider_event_id = p_event_id) then
    return 'duplicate';
  end if;
  insert into private.payment_events (provider_event_id, payment_id, amount_kobo) values (p_event_id, v_pay.id, p_amount_kobo);
  select * into v_load from public.loads where id = v_pay.load_id for update;
  v_escrow := private.ledger_account('escrow', null, v_load.id);
  perform private.post_ledger('fund_load', 'pay:' || p_event_id,
    jsonb_build_array(
      jsonb_build_object('account', private.ledger_account('provider_cash'), 'debit', p_amount_kobo),
      jsonb_build_object('account', v_escrow, 'credit', p_amount_kobo)),
    v_load.id, null, 'Payment received ' || v_pay.id);
  update public.payments set received_kobo = received_kobo + p_amount_kobo, received_at = now(),
    status = case when received_kobo + p_amount_kobo >= amount_kobo then 'received'::public.payment_status else status end
  where id = v_pay.id;

  v_held := private.ledger_balance(v_escrow);
  if v_pay.purpose = 'load' and v_load.status = 'awaiting_payment' then
    v_needed := v_load.total_kobo;
    if v_held >= v_needed then
      update public.loads set status = 'funded', funded_at = now(),
        no_truck_decision_due_at = now() + make_interval(hours => (private.setting('no_truck_decision_hours'))::int), updated_at = now()
      where id = v_load.id;
      v_extra := v_held - v_needed;
    else
      return 'partial';
    end if;
  elsif v_pay.purpose = 'top_up' and v_load.status in ('funded', 'matched') then
    -- A counter's top-up: accepted by private.accept_offer below once it is all here.
    v_needed := v_load.total_kobo + coalesce((select o.amount_kobo - v_load.freight_kobo from public.offers o where o.id = v_pay.offer_id), 0)
      + coalesce((select private.round_to((o.amount_kobo - v_load.freight_kobo) * v_load.fee_bps / 10000.0, 10000) from public.offers o where o.id = v_pay.offer_id), 0);
    if (select received_kobo from public.payments where id = v_pay.id) < v_pay.amount_kobo then
      return 'partial';
    end if;
    if v_load.status = 'funded' and exists (select 1 from public.offers where id = v_pay.offer_id and status = 'awaiting_top_up') then
      perform private.accept_offer(v_pay.offer_id, null);
      return 'funded';
    end if;
    v_extra := least(v_held, p_amount_kobo);
  else
    -- Paid after the load was cancelled or expired (§4.3): all of it goes back.
    v_extra := least(v_held, p_amount_kobo);
  end if;
  if v_extra > 0 then
    perform private.queue_refund(v_load.id, v_extra, 'Paid more than the price', 'surplus:' || p_event_id);
  end if;
  return 'funded';
end;
$$;

-- Escrow → the sender's refundable balance, and a refund to pay (one refund per payment, §7.5).
create function private.queue_refund(p_load uuid, p_amount bigint, p_reason text, p_key text, p_by uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_load public.loads;
  v_tx uuid;
  v_id uuid;
begin
  select * into v_load from public.loads where id = p_load;
  select id into v_id from public.refunds where idempotency_key = p_key;
  if v_id is not null then
    return v_id;
  end if;
  if p_amount > private.ledger_balance(private.ledger_account('escrow', null, p_load)) then
    raise exception 'refund larger than the money held for this load' using errcode = '23514';
  end if;
  v_tx := private.post_ledger('refund', p_key,
    jsonb_build_array(
      jsonb_build_object('account', private.ledger_account('escrow', null, p_load), 'debit', p_amount),
      jsonb_build_object('account', private.ledger_account('shipper_refundable', v_load.shipper_org_id, null), 'credit', p_amount)),
    p_load, null, p_reason);
  insert into public.refunds (load_id, shipper_org_id, amount_kobo, reason, ledger_transaction_id, idempotency_key, requested_by)
  values (p_load, v_load.shipper_org_id, p_amount, p_reason, v_tx, p_key, p_by)
  returning id into v_id;
  return v_id;
end;
$$;

-- Server only: the provider paid a refund out.
create function public.refund_paid(p_refund uuid, p_provider_ref text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_r public.refunds;
begin
  select * into v_r from public.refunds where id = p_refund for update;
  if v_r.id is null or v_r.status = 'paid' then
    return;
  end if;
  perform private.post_ledger('refund', 'refund-paid:' || p_refund,
    jsonb_build_array(
      jsonb_build_object('account', private.ledger_account('shipper_refundable', v_r.shipper_org_id, null), 'debit', v_r.amount_kobo),
      jsonb_build_object('account', private.ledger_account('provider_cash'), 'credit', v_r.amount_kobo)),
    v_r.load_id, null, 'Refund paid');
  update public.refunds set status = 'paid', provider_ref = p_provider_ref, paid_at = now() where id = p_refund;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Offers: accept at the listed price, or counter once up to +20% (SYSTEM-LOGIC §3.3, §3.4).
-- ---------------------------------------------------------------------------------------------------
create function private.owner_tier(p_org uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce(tier::text, 'new') from public.organizations where id = p_org;
$$;

-- Makes the trip for an accepted offer. The load must be funded; the truck must fit (D046: never a
-- load heavier than its capacity).
create function private.accept_offer(p_offer uuid, p_by uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_offer public.offers;
  v_load public.loads;
  v_truck public.trucks;
  v_tier text;
  v_commission_bps int;
  v_advance_bps int;
  v_done int;
  v_trip uuid;
begin
  select * into v_offer from public.offers where id = p_offer for update;
  select * into v_load from public.loads where id = v_offer.load_id for update;
  if v_load.status <> 'funded' then
    update public.offers set status = 'expired' where id = p_offer and status in ('pending', 'awaiting_top_up');
    raise exception 'this load was just taken' using errcode = '40001';
  end if;
  select * into v_truck from public.trucks where id = v_offer.truck_id;
  if v_truck.id is null or v_truck.org_id <> v_offer.transporter_org_id or v_truck.status <> 'active' then
    raise exception 'choose an active truck' using errcode = '22023';
  end if;
  -- Every path to a trip checks these again (review): demo stays with demo, the driver is active here.
  if v_load.is_demo <> coalesce((select is_demo from public.organizations where id = v_offer.transporter_org_id), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_offer.driver_id is not null and not exists (select 1 from public.drivers where user_id = v_offer.driver_id and org_id = v_offer.transporter_org_id and status = 'active' and not paused) then
    raise exception 'choose one of your active drivers' using errcode = '22023';
  end if;
  if coalesce(v_load.weight_kg, 0) > v_truck.capacity_kg then
    raise exception 'this load is heavier than the truck can carry' using errcode = '22023';
  end if;
  v_tier := private.owner_tier(v_offer.transporter_org_id);
  select count(*) into v_done from public.trips where transporter_org_id = v_offer.transporter_org_id and status in ('delivered', 'closed');
  v_commission_bps := case when v_done < coalesce((private.setting('first_trips_no_commission'))::int, 0) then 0
    else coalesce((private.setting('commission_bps') ->> v_tier)::int, 500) end;
  v_advance_bps := coalesce((private.setting('advance_bps') ->> v_tier)::int, 3000);
  insert into public.trips (ref, load_id, transporter_org_id, truck_id, driver_id, freight_kobo, commission_bps, commission_kobo, advance_bps, advance_kobo)
  values (v_load.ref || '-T1', v_load.id, v_offer.transporter_org_id, v_truck.id, coalesce(v_offer.driver_id, v_truck.default_driver_id),
    v_offer.amount_kobo, v_commission_bps, private.round_to(v_offer.amount_kobo * v_commission_bps / 10000.0, 100),
    v_advance_bps, private.round_to(v_offer.amount_kobo * v_advance_bps / 10000.0, 100))
  returning id into v_trip;
  update public.offers set status = 'accepted' where id = p_offer;
  update public.offers set status = 'expired' where load_id = v_load.id and id <> p_offer and status in ('pending', 'awaiting_top_up');
  update public.loads set status = 'matched', matched_at = now(), updated_at = now() where id = v_load.id;
  update public.trucks set availability = 'on_trip' where id = v_truck.id;
  insert into public.trip_events (trip_id, type, actor_user_id, actor_kind, payload) values (v_trip, 'assigned', p_by, 'owner', jsonb_build_object('offer', p_offer));
  return v_trip;
end;
$$;

-- T-05 Accept for ₦X: the owner or an admin picks the truck and driver.
create function public.accept_load(p_load uuid, p_truck uuid, p_driver uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_org uuid;
  v_load public.loads;
  v_offer uuid;
begin
  select org_id into v_org from public.trucks where id = p_truck;
  if v_org is null or not public.can_in_org(v_org, 'load_board') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_driver is not null and not exists (select 1 from public.drivers where user_id = p_driver and org_id = v_org and status = 'active' and not paused) then
    raise exception 'choose one of your active drivers' using errcode = '22023';
  end if;
  select * into v_load from public.loads where id = p_load for update;
  if v_load.id is null or v_load.is_demo <> coalesce((select is_demo from public.organizations where id = v_org), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.offers (load_id, transporter_org_id, truck_id, driver_id, kind, amount_kobo, status, created_by)
  values (p_load, v_org, p_truck, p_driver, 'accept', v_load.freight_kobo, 'pending', v_user)
  returning id into v_offer;
  return private.accept_offer(v_offer, v_user);
end;
$$;

-- T-06 Offer a different price: once per owner per load, up to +counter_max_bps, never lower.
create function public.counter_load(p_load uuid, p_truck uuid, p_amount_kobo bigint, p_driver uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_org uuid;
  v_load public.loads;
  v_id uuid;
begin
  select org_id into v_org from public.trucks where id = p_truck;
  if v_org is null or not public.can_in_org(v_org, 'load_board') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_driver is not null and not exists (select 1 from public.drivers where user_id = p_driver and org_id = v_org and status = 'active' and not paused) then
    raise exception 'choose one of your active drivers' using errcode = '22023';
  end if;
  select * into v_load from public.loads where id = p_load;
  if v_load.id is null or v_load.is_demo <> coalesce((select is_demo from public.organizations where id = v_org), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_load.status <> 'funded' then
    raise exception 'this load was just taken' using errcode = '40001';
  end if;
  if p_amount_kobo <= v_load.freight_kobo or p_amount_kobo > v_load.freight_kobo + v_load.freight_kobo * (private.setting('counter_max_bps'))::bigint / 10000 then
    raise exception 'a counter is above the price and at most 20 percent more' using errcode = '22023';
  end if;
  insert into public.offers (load_id, transporter_org_id, truck_id, driver_id, kind, amount_kobo, expires_at, created_by)
  values (p_load, v_org, p_truck, p_driver, 'counter', private.round_to(p_amount_kobo, 100000), now() + make_interval(hours => (private.setting('counter_expiry_hours'))::int), v_user)
  returning id into v_id;
  return v_id;
end;
$$;

-- S-07 the sender accepts a counter: a top-up payment for the difference and the fee on it.
create function public.accept_counter(p_offer uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_offer public.offers;
  v_load public.loads;
  v_extra bigint;
  v_payment uuid;
begin
  select * into v_offer from public.offers where id = p_offer for update;
  select * into v_load from public.loads where id = v_offer.load_id;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'decide_offers') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_offer.kind <> 'counter' or v_offer.status <> 'pending' or v_offer.expires_at < now() or v_load.status <> 'funded' then
    raise exception 'this offer has closed' using errcode = '22023';
  end if;
  v_extra := (v_offer.amount_kobo - v_load.freight_kobo) + private.round_to((v_offer.amount_kobo - v_load.freight_kobo) * v_load.fee_bps / 10000.0, 10000);
  insert into public.payments (purpose, shipper_org_id, load_id, offer_id, amount_kobo, expires_at, created_by)
  values ('top_up', v_load.shipper_org_id, v_load.id, p_offer, v_extra, v_offer.expires_at, v_user)
  returning id into v_payment;
  update public.offers set status = 'awaiting_top_up', top_up_payment_id = v_payment where id = p_offer;
  return v_payment;
end;
$$;

create function public.decline_counter(p_offer uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.offers o join public.loads l on l.id = o.load_id where o.id = p_offer and public.can_in_org(l.shipper_org_id, 'decide_offers')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.offers set status = 'declined' where id = p_offer and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Releases (SYSTEM-LOGIC §7.1–§7.3). Loading releases the advance; delivery (after the dispute window)
-- releases the balance. Neither can happen out of order.
-- ---------------------------------------------------------------------------------------------------
create function private.queue_payout(p_trip uuid, p_kind public.payout_kind, p_amount bigint, p_tx uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_bank uuid;
  v_id uuid;
begin
  select * into v_trip from public.trips where id = p_trip;
  select default_bank_account_id into v_bank from public.organizations where id = v_trip.transporter_org_id;
  insert into public.payouts (kind, org_id, trip_id, bank_account_id, amount_kobo, ledger_transaction_id, idempotency_key,
    status)
  values (p_kind, v_trip.transporter_org_id, p_trip, v_bank, p_amount, p_tx, 'payout:' || p_trip || ':' || p_kind,
    case when p_amount > (private.setting('payout_two_person_kobo'))::bigint then 'awaiting_approval'::public.payout_status else 'queued' end)
  on conflict (idempotency_key) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- Loaded (Phase 4 calls this when the loading code is right; staff and the demo can call it now).
create function private.trip_loaded(p_trip uuid, p_by uuid, p_weight_kg int default null, p_quantity int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_tx uuid;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if v_trip.id is null then
    raise exception 'unknown trip' using errcode = 'P0002';
  end if;
  if v_trip.status = 'loaded' or v_trip.loaded_at is not null then
    return;
  end if;
  if v_trip.status not in ('assigned', 'to_pickup', 'at_pickup', 'loading') then
    raise exception 'this trip can''t be marked loaded now' using errcode = '22023';
  end if;
  update public.trips set status = 'loaded', loaded_at = now(), status_changed_at = now(),
    loaded_weight_kg = coalesce(p_weight_kg, loaded_weight_kg), loaded_quantity = coalesce(p_quantity, loaded_quantity)
  where id = p_trip;
  insert into public.trip_events (trip_id, type, actor_user_id, actor_kind, payload)
  values (p_trip, 'loaded', p_by, case when p_by is null then 'system' else 'staff' end, jsonb_build_object('weight_kg', p_weight_kg, 'quantity', p_quantity));
  if v_trip.advance_kobo > 0 then
    v_tx := private.post_ledger('advance', 'payout:' || p_trip || ':advance',
      jsonb_build_array(
        jsonb_build_object('account', private.ledger_account('escrow', null, v_trip.load_id), 'debit', v_trip.advance_kobo),
        jsonb_build_object('account', private.ledger_account('owner_payable', v_trip.transporter_org_id, null), 'credit', v_trip.advance_kobo)),
      v_trip.load_id, p_trip, 'Advance at loading');
    perform private.queue_payout(p_trip, 'advance', v_trip.advance_kobo, v_tx);
  end if;
end;
$$;

-- Delivered (Phase 4: the delivery code). The balance waits auto_release_hours for a problem report.
create function private.trip_delivered(p_trip uuid, p_by uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if v_trip.status in ('delivered', 'closed') then
    return;
  end if;
  if v_trip.loaded_at is null or v_trip.status not in ('loaded', 'in_transit', 'arrived') then
    raise exception 'a trip is delivered only after loading' using errcode = '22023';
  end if;
  update public.trips set status = 'delivered', delivered_at = now(), status_changed_at = now(),
    auto_release_at = now() + make_interval(hours => (private.setting('auto_release_hours'))::int)
  where id = p_trip;
  insert into public.trip_events (trip_id, type, actor_user_id, actor_kind) values (p_trip, 'delivered', p_by, case when p_by is null then 'system' else 'staff' end);
end;
$$;

-- The balance: escrow → the owner's pay (freight − advance − commission) and our revenue (fee +
-- commission). Refused before delivery (and before loading).
create function private.release_balance(p_trip uuid, p_force boolean default false) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_load public.loads;
  v_balance bigint;
  v_revenue bigint;
  v_held bigint;
  v_tx uuid;
  v_lines jsonb;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if v_trip.id is null or v_trip.status <> 'delivered' or v_trip.loaded_at is null then
    raise exception 'the balance is released only after delivery' using errcode = '22023';
  end if;
  if not p_force and v_trip.auto_release_at > now() then
    raise exception 'the balance waits for the problem window' using errcode = '22023';
  end if;
  select * into v_load from public.loads where id = v_trip.load_id;
  v_balance := v_trip.freight_kobo - v_trip.advance_kobo - v_trip.commission_kobo;
  v_held := private.ledger_balance(private.ledger_account('escrow', null, v_load.id));
  v_revenue := v_held - v_balance;
  v_lines := jsonb_build_array(jsonb_build_object('account', private.ledger_account('escrow', null, v_load.id), 'debit', v_held));
  if v_balance > 0 then
    v_lines := v_lines || jsonb_build_object('account', private.ledger_account('owner_payable', v_trip.transporter_org_id, null), 'credit', v_balance);
  end if;
  if v_revenue > 0 then
    v_lines := v_lines || jsonb_build_object('account', private.ledger_account('platform_revenue'), 'credit', v_revenue);
  end if;
  v_tx := private.post_ledger('balance', 'payout:' || p_trip || ':balance', v_lines, v_load.id, p_trip, 'Balance after delivery');
  if v_balance > 0 then
    perform private.queue_payout(p_trip, 'balance', v_balance, v_tx);
  end if;
  update public.trips set status = 'closed', closed_at = now(), status_changed_at = now() where id = p_trip;
  update public.trucks set availability = 'available' where id = v_trip.truck_id;
  return v_tx;
end;
$$;

-- Server only: a payout left our provider account.
create function public.payout_paid(p_payout uuid, p_provider_ref text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_p public.payouts;
begin
  select * into v_p from public.payouts where id = p_payout for update;
  if v_p.id is null or v_p.status = 'paid' then
    return;
  end if;
  if v_p.status not in ('queued', 'processing') then
    raise exception 'this payout is not ready to pay' using errcode = '22023';
  end if;
  perform private.post_ledger(case v_p.kind when 'balance' then 'balance'::public.ledger_transaction_kind when 'cancellation_fee' then 'cancellation'::public.ledger_transaction_kind else 'advance'::public.ledger_transaction_kind end, 'payout-paid:' || p_payout,
    jsonb_build_array(
      jsonb_build_object('account', private.ledger_account('owner_payable', v_p.org_id, null), 'debit', v_p.amount_kobo),
      jsonb_build_object('account', private.ledger_account('provider_cash'), 'credit', v_p.amount_kobo)),
    null, v_p.trip_id, 'Payout paid');
  update public.payouts set status = 'paid', provider_ref = p_provider_ref, paid_at = now(), attempts = attempts + 1 where id = p_payout;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Cancellations (SYSTEM-LOGIC §4.4).
-- ---------------------------------------------------------------------------------------------------
create function public.cancel_load(p_load uuid, p_reason text default null) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_load public.loads;
  v_trip public.trips;
  v_fee bigint;
  v_held bigint;
  v_refund bigint;
  v_tx uuid;
begin
  select * into v_load from public.loads where id = p_load for update;
  if v_load.id is null or not (public.can_in_org(v_load.shipper_org_id, 'cancel_any_booking')
    or (public.can_in_org(v_load.shipper_org_id, 'cancel_own_booking') and v_load.created_by = v_user)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_load.status in ('cancelled', 'refunded') then
    return 'already';
  end if;
  if v_load.status in ('draft', 'awaiting_payment', 'expired') then
    update public.loads set status = 'cancelled', cancelled_reason = p_reason, updated_at = now() where id = p_load;
    update public.payments set status = 'expired' where load_id = p_load and status = 'pending' and received_kobo = 0;
    v_held := private.ledger_balance(private.ledger_account('escrow', null, p_load));
    if v_held > 0 then
      perform private.queue_refund(p_load, v_held, 'Cancelled before it was paid in full', 'cancel:' || p_load, v_user);
    end if;
    return 'cancelled';
  end if;
  v_held := private.ledger_balance(private.ledger_account('escrow', null, p_load));
  if v_load.status = 'funded' then
    perform private.queue_refund(p_load, v_held, coalesce(p_reason, 'Cancelled before a truck was assigned'), 'cancel:' || p_load, v_user);
    update public.loads set status = 'refunded', cancelled_reason = p_reason, updated_at = now() where id = p_load;
    update public.offers set status = 'withdrawn' where load_id = p_load and status in ('pending', 'awaiting_top_up');
    return 'refunded';
  end if;
  -- Matched: depends on where the truck is.
  select * into v_trip from public.trips where load_id = p_load and status not in ('cancelled', 'closed') for update;
  if v_trip.status in ('loaded', 'in_transit', 'arrived', 'delivered', 'delivered_with_exception') then
    raise exception 'after loading, talk to us: we''ll arrange a return or open a problem' using errcode = '22023';
  end if;
  if v_trip.status in ('assigned', 'to_pickup') then
    perform private.queue_refund(p_load, v_held, coalesce(p_reason, 'Cancelled before the truck reached pickup'), 'cancel:' || p_load, v_user);
  else
    -- At pickup or loading: the owner gets the cancellation fee, we keep the service fee (D019).
    v_fee := least((private.setting('cancellation_fee_kobo'))::bigint, v_held - v_load.fee_kobo);
    v_refund := v_held - v_load.fee_kobo - v_fee;
    v_tx := private.post_ledger('cancellation', 'cancel:' || p_load,
      jsonb_build_array(
        jsonb_build_object('account', private.ledger_account('escrow', null, p_load), 'debit', v_held),
        jsonb_build_object('account', private.ledger_account('owner_payable', v_trip.transporter_org_id, null), 'credit', v_fee))
      || case when v_load.fee_kobo > 0 then jsonb_build_array(jsonb_build_object('account', private.ledger_account('platform_revenue'), 'credit', v_load.fee_kobo)) else '[]'::jsonb end
      || case when v_refund > 0 then jsonb_build_array(jsonb_build_object('account', private.ledger_account('shipper_refundable', v_load.shipper_org_id, null), 'credit', v_refund)) else '[]'::jsonb end,
      p_load, v_trip.id, 'Cancelled at pickup');
    if v_refund > 0 then
      insert into public.refunds (load_id, shipper_org_id, amount_kobo, reason, ledger_transaction_id, idempotency_key, requested_by)
      values (p_load, v_load.shipper_org_id, v_refund, coalesce(p_reason, 'Cancelled at pickup'), v_tx, 'cancel-refund:' || p_load, v_user);
    end if;
    perform private.queue_payout(v_trip.id, 'cancellation_fee', v_fee, v_tx);
  end if;
  update public.trips set status = 'cancelled', status_changed_at = now() where id = v_trip.id;
  update public.trucks set availability = 'available' where id = v_trip.truck_id;
  update public.loads set status = 'cancelled', cancelled_reason = p_reason, updated_at = now() where id = p_load;
  return 'cancelled';
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Staff: finance refunds (two people above the payout threshold), and the trip steps Phase 4 automates.
-- ---------------------------------------------------------------------------------------------------
create function public.staff_refund(p_load uuid, p_amount_kobo bigint, p_reason text) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if coalesce(public.my_staff_role()::text, '') not in ('finance', 'super_admin') or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_amount_kobo is null or p_amount_kobo <= 0 or char_length(coalesce(p_reason, '')) < 3 then
    raise exception 'an amount and a reason' using errcode = '22023';
  end if;
  v_id := private.queue_refund(p_load, p_amount_kobo, p_reason, 'staff-refund:' || p_load || ':' || gen_random_uuid(), v_user);
  update public.refunds set status = case when p_amount_kobo > (private.setting('payout_two_person_kobo'))::bigint then 'awaiting_approval'::public.refund_status else 'queued' end where id = v_id;
  perform private.audit('refund.requested', 'refunds', v_id::text, null, jsonb_build_object('amount_kobo', p_amount_kobo, 'reason', p_reason));
  return v_id;
end;
$$;

create function public.approve_money_out(p_kind text, p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_requested uuid;
begin
  if coalesce(public.my_staff_role()::text, '') not in ('finance', 'super_admin') or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind = 'refund' then
    select requested_by into v_requested from public.refunds where id = p_id and status = 'awaiting_approval';
    if v_requested = v_user then
      raise exception 'a second person approves it' using errcode = '42501';
    end if;
    update public.refunds set status = 'queued', approved_by = v_user where id = p_id and status = 'awaiting_approval';
  elsif p_kind = 'payout' then
    update public.payouts set status = 'queued', approved_by = v_user where id = p_id and status = 'awaiting_approval';
  else
    raise exception 'refund or payout' using errcode = '22023';
  end if;
  perform private.audit('money_out.approved', p_kind || 's', p_id::text, null, null);
end;
$$;

-- Operations staff (and the demo, D039) move a trip through loading and delivery until Phase 4's codes
-- do it: 'loaded', 'delivered', 'release'.
create function public.staff_trip_step(p_trip uuid, p_step text, p_weight_kg int default null, p_quantity int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_demo boolean;
begin
  select l.is_demo into v_demo from public.trips t join public.loads l on l.id = t.load_id where t.id = p_trip;
  if not (coalesce(public.my_staff_role()::text, '') in ('operations', 'super_admin') and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2')
     and not (v_demo and exists (select 1 from public.trips t where t.id = p_trip and public.can_in_org(t.transporter_org_id, 'assign'))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_step = 'loaded' then
    perform private.trip_loaded(p_trip, v_user, p_weight_kg, p_quantity);
  elsif p_step = 'delivered' then
    perform private.trip_delivered(p_trip, v_user);
  elsif p_step = 'release' then
    perform private.release_balance(p_trip, v_demo);
  else
    raise exception 'loaded, delivered or release' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Reading: senders see their loads, payments and refunds; owners see their trips; drivers see their
-- own trips without money (D003). Money columns are read through functions that check see_money.
-- ---------------------------------------------------------------------------------------------------
alter table public.loads enable row level security;
alter table public.load_stops enable row level security;
alter table public.payments enable row level security;
alter table public.offers enable row level security;
alter table public.trips enable row level security;
alter table public.trip_events enable row level security;
alter table public.payouts enable row level security;
alter table public.refunds enable row level security;

-- Loads and trips refer to each other; these definer helpers keep their policies from looping.
create function public.load_sender_sees(p_load uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select public.can_in_org(l.shipper_org_id, 'view_trips') from public.loads l where l.id = p_load), false);
$$;
create function public.load_carrier_sees(p_load uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.trips t where t.load_id = p_load and public.can_in_org(t.transporter_org_id, 'load_board'));
$$;

create function public.can_see_trip(p_trip public.trips) returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_in_org(p_trip.transporter_org_id, 'view_trips') and (public.can_in_org(p_trip.transporter_org_id, 'load_board') or p_trip.driver_id = (select auth.uid()));
$$;

create policy "loads: sender reads" on public.loads for select to authenticated using ((select public.can_in_org(shipper_org_id, 'view_trips')));
create policy "loads: carrier of the trip reads" on public.loads for select to authenticated using ((select public.load_carrier_sees(id)));
create policy "loads: staff read" on public.loads for select to authenticated using ((select public.is_staff()));
create policy "stops: as the load" on public.load_stops for select to authenticated using ((select public.load_sender_sees(load_id)) or (select public.load_carrier_sees(load_id)) or (select public.is_staff()));
create policy "payments: sender money" on public.payments for select to authenticated using ((select public.can_in_org(shipper_org_id, 'pay')) or (select public.can_in_org(shipper_org_id, 'see_money')));
create policy "payments: staff read" on public.payments for select to authenticated using ((select public.is_staff()));
create policy "offers: sender" on public.offers for select to authenticated using ((select public.load_sender_sees(load_id)));
create policy "offers: owner" on public.offers for select to authenticated using ((select public.can_in_org(transporter_org_id, 'load_board')));
create policy "offers: staff" on public.offers for select to authenticated using ((select public.is_staff()));
create policy "trips: sender" on public.trips for select to authenticated using ((select public.load_sender_sees(load_id)));
create policy "trips: carrier" on public.trips for select to authenticated using ((select public.can_see_trip(trips)));
create policy "trips: staff" on public.trips for select to authenticated using ((select public.is_staff()));
create policy "trip events: as the trip" on public.trip_events for select to authenticated using (exists (select 1 from public.trips t where t.id = trip_events.trip_id));
create policy "payouts: owner money" on public.payouts for select to authenticated using ((select public.can_in_org(org_id, 'see_money')));
create policy "payouts: staff" on public.payouts for select to authenticated using ((select public.is_staff()));
create policy "refunds: sender money" on public.refunds for select to authenticated using ((select public.can_in_org(shipper_org_id, 'see_money')));
create policy "refunds: staff" on public.refunds for select to authenticated using ((select public.is_staff()));

revoke all on public.loads, public.load_stops, public.payments, public.offers, public.trips, public.trip_events, public.payouts, public.refunds from anon, authenticated;
grant select on public.load_stops, public.payments, public.offers, public.trip_events, public.payouts, public.refunds to authenticated;
grant select, insert, update, delete on public.loads, public.load_stops, public.payments, public.offers, public.trips, public.trip_events, public.payouts, public.refunds, public.lane_prices to service_role;
-- Loads: everything a sender or carrier reads; money columns are fine for both (the price is the deal).
grant select on public.loads to authenticated;
-- Trips: drivers read their trips, so the money columns are not granted; owners read them through trip_money().
grant select (id, ref, load_id, transporter_org_id, truck_id, driver_id, status, loaded_weight_kg, loaded_quantity, last_location, last_ping_at,
  eta_at, loaded_at, delivered_at, auto_release_at, status_changed_at, closed_at, created_at) on public.trips to authenticated;

-- What a trip pays the owner (owners and admins only, never drivers, D003).
create function public.trip_money(p_trip uuid) returns table (freight_kobo bigint, commission_kobo bigint, advance_kobo bigint, balance_kobo bigint)
language sql stable security definer set search_path = '' as $$
  select t.freight_kobo, t.commission_kobo, t.advance_kobo, t.freight_kobo - t.advance_kobo - t.commission_kobo
  from public.trips t where t.id = p_trip and public.can_in_org(t.transporter_org_id, 'see_money');
$$;

-- T-04 load board: funded loads a truck owner may take (demo sees demo, real sees real, D039),
-- without the sender's contact details or exact addresses (SYSTEM-LOGIC §3.2).
create function public.load_board(p_org uuid) returns table (
  load_id uuid, ref text, from_city text, to_city text, goods text, weight_kg int, quantity int, quantity_unit text,
  truck_type text, truck_type_id uuid, pickup_from timestamptz, pickup_until timestamptz, freight_kobo bigint, payout_kobo bigint, value_band text
) language sql stable security definer set search_path = '' as $$
  select l.id, l.ref, fc.name, tc.name, g.name, l.weight_kg, l.quantity, l.quantity_unit, tt.name, l.truck_type_id, l.pickup_from, l.pickup_until,
    l.freight_kobo,
    l.freight_kobo - private.round_to(l.freight_kobo * coalesce((private.setting('commission_bps') ->> private.owner_tier(p_org))::int, 500) / 10000.0, 100),
    case when l.declared_value_kobo < 300000000 then 'under ₦3m' when l.declared_value_kobo <= 1000000000 then '₦3m to ₦10m' else 'over ₦10m' end
  from public.loads l
  join public.cities fc on fc.id = l.from_city_id
  join public.cities tc on tc.id = l.to_city_id
  join public.goods_categories g on g.id = l.goods_category_id
  join public.truck_types tt on tt.id = l.truck_type_id
  where public.can_in_org(p_org, 'load_board') and l.status = 'funded'
    and l.is_demo = coalesce((select is_demo from public.organizations where id = p_org), false)
  order by l.pickup_from;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.quote_load(uuid, uuid, uuid, uuid, int)',
    'public.create_load(uuid, uuid, text, uuid, int, int, text, bigint, timestamptz, timestamptz, jsonb, text)',
    'public.request_load_payment(uuid)',
    'public.accept_load(uuid, uuid, uuid)',
    'public.counter_load(uuid, uuid, bigint, uuid)',
    'public.accept_counter(uuid)',
    'public.decline_counter(uuid)',
    'public.cancel_load(uuid, text)',
    'public.staff_refund(uuid, bigint, text)',
    'public.approve_money_out(text, uuid)',
    'public.staff_trip_step(uuid, text, int, int)',
    'public.trip_money(uuid)',
    'public.load_board(uuid)',
    'public.can_see_trip(public.trips)',
    'public.load_sender_sees(uuid)',
    'public.load_carrier_sees(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'public.attach_collection(uuid, text, text, text, text)',
    'public.confirm_payment(text, text, bigint)',
    'public.refund_paid(uuid, text)',
    'public.payout_paid(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array[
    'private.price(uuid, uuid, uuid, uuid, int)', 'private.shipper_fee_bps(uuid)', 'private.queue_refund(uuid, bigint, text, text, uuid)',
    'private.accept_offer(uuid, uuid)', 'private.owner_tier(uuid)', 'private.queue_payout(uuid, public.payout_kind, bigint, uuid)',
    'private.trip_loaded(uuid, uuid, int, int)', 'private.trip_delivered(uuid, uuid)', 'private.release_balance(uuid, boolean)',
    'private.round_to(numeric, bigint)', 'private.new_ref()'
  ] loop
    execute format('revoke all on function %s from public', f);
  end loop;
end;
$$;
