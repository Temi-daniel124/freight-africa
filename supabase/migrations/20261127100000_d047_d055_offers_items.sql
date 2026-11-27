-- Combined brief slice 5b: sender offers (D047), several goods per booking and availability by day (D055).
-- Money rules (AGENT.md §3): kobo as bigint, every movement a balanced ledger posting inside a function,
-- idempotent per provider event. Offers never move money themselves: they change what a payment is for.

-- ---------------------------------------------------------------------------------------------------
-- Settings and types.
-- ---------------------------------------------------------------------------------------------------
insert into public.settings (key, value, is_money, description) values
  ('offer_min_bps', '8000', true, 'Lowest offer a sender may make, as a share of our price in basis points (80%).'),
  ('reoffer_reply_minutes', '60', false, 'Minutes an owner has to answer a sender''s second offer.')
on conflict (key) do nothing;

-- New values are only used inside function bodies, which run after this migration commits.
alter type public.offer_kind add value if not exists 'reoffer';
alter type public.payment_purpose add value if not exists 'raise';

-- An offered load: freight_kobo/fee_kobo/total_kobo are the offer; list_freight_kobo is our price when
-- the sender booked (null when they booked at our price). offer_total_kobo is what they chose to pay.
alter table public.loads
  add column list_freight_kobo bigint check (list_freight_kobo is null or list_freight_kobo > 0),
  add column offer_total_kobo bigint check (offer_total_kobo is null or offer_total_kobo > 0),
  add constraint loads_offer_pair check ((list_freight_kobo is null) = (offer_total_kobo is null));

-- A raise (P11c): what the load becomes once the raise is paid in full.
alter table public.payments
  add column raise_freight_kobo bigint check (raise_freight_kobo is null or raise_freight_kobo > 0),
  add column raise_fee_kobo bigint check (raise_fee_kobo is null or raise_fee_kobo >= 0),
  add constraint payments_raise_pair check ((raise_freight_kobo is null) = (raise_fee_kobo is null)),
  -- When a top-up or raise took effect: from then its amount is kept and only money beyond it goes back.
  add column applied_at timestamptz;

-- ---------------------------------------------------------------------------------------------------
-- Several goods per booking (D055). The load keeps the first item's category (matching, exclusions),
-- the total weight when every item's weight is known, and the total declared value.
-- ---------------------------------------------------------------------------------------------------
create table public.load_items (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references public.loads (id) on delete cascade,
  seq int not null check (seq between 0 and 9),
  goods_category_id uuid not null references public.goods_categories (id),
  description text not null check (char_length(description) between 2 and 120),
  weight_kg int check (weight_kg is null or weight_kg between 1 and 60000),
  quantity int check (quantity is null or quantity between 1 and 1000000),
  quantity_unit text check (quantity_unit is null or quantity_unit in ('bags', 'cartons', 'pieces', 'drums', 'tonnes', 'head')),
  unit_weight_kg int check (unit_weight_kg is null or unit_weight_kg between 1 and 5000),
  declared_value_kobo bigint not null default 0 check (declared_value_kobo >= 0),
  unique (load_id, seq),
  check ((quantity is null) = (quantity_unit is null)),
  check (weight_kg is not null or quantity is not null)
);
alter table public.load_items enable row level security;
create policy "load items: the sender and the carrier" on public.load_items for select to authenticated
  using (public.load_sender_sees(load_id) or public.load_carrier_sees(load_id) or (select public.is_staff()));
revoke all on public.load_items from anon, authenticated;
grant select on public.load_items to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Offer arithmetic. The sender chooses a total (fee included) in ₦1,000 steps; the fee is taken out of
-- it so the total is exactly what they pay.
-- ---------------------------------------------------------------------------------------------------
create function private.offer_split(p_total bigint, p_fee_bps int, out freight_kobo bigint, out fee_kobo bigint)
language plpgsql immutable set search_path = '' as $$
begin
  fee_kobo := private.round_to(p_total * p_fee_bps / (10000.0 + p_fee_bps), 10000);
  freight_kobo := p_total - fee_kobo;
end;
$$;

-- The lowest offer total for a list total: offer_min_bps of it, rounded up to ₦1,000.
create function private.offer_floor(p_list_total bigint) returns bigint language sql stable security definer set search_path = '' as $$
  select (ceil(p_list_total * (private.setting('offer_min_bps'))::numeric / 10000 / 100000) * 100000)::bigint;
$$;

-- ---------------------------------------------------------------------------------------------------
-- P08 and P09: the quote with the route facts, the offer floor and, only when there is enough real
-- history (5 or more trips in 90 days), the usual range and the offers owners usually accept.
-- ---------------------------------------------------------------------------------------------------
create function public.quote_booking(p_org uuid, p_from uuid, p_to uuid, p_truck_type uuid, p_dropoffs int default 1)
returns table (freight_kobo bigint, fee_bps int, fee_kobo bigint, total_kobo bigint, min_offer_kobo bigint,
  distance_km int, typical_hours int, usual_low_kobo bigint, usual_high_kobo bigint, accepted_from_kobo bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_price record;
  v_usual record;
  v_accepted bigint;
begin
  if not public.can_in_org(p_org, 'book') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_price from private.price(p_org, p_from, p_to, p_truck_type, p_dropoffs);
  if v_price.freight_kobo is null then
    return;
  end if;
  select count(*) as n,
    (percentile_cont(0.1) within group (order by l.total_kobo))::bigint as lo,
    (percentile_cont(0.9) within group (order by l.total_kobo))::bigint as hi
  into v_usual
  from public.loads l
  where l.from_city_id = p_from and l.to_city_id = p_to and l.truck_type_id = p_truck_type and l.funded_at > now() - interval '90 days' and not l.is_demo;
  select case when count(*) >= 5 then (percentile_cont(0.2) within group (order by tr.freight_kobo + private.fee_due(l.id, tr.freight_kobo)))::bigint end
  into v_accepted
  from public.loads l join public.trips tr on tr.load_id = l.id
  where l.from_city_id = p_from and l.to_city_id = p_to and l.truck_type_id = p_truck_type and l.list_freight_kobo is not null
    and l.matched_at > now() - interval '90 days' and not l.is_demo;
  return query
  select v_price.freight_kobo, v_price.fee_bps, v_price.fee_kobo, v_price.total_kobo, private.offer_floor(v_price.total_kobo),
    c.distance_km, c.typical_hours,
    case when v_usual.n >= 5 then v_usual.lo end, case when v_usual.n >= 5 then v_usual.hi end, v_accepted
  from public.corridors c where c.id = v_price.corridor_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- D055: how many trucks of each type are free on each of the next days, on this route. A truck counts
-- when it is approved and active, works this corridor (its own list, else its owner's), is not marked
-- unavailable for that day, and has no live trip loading within the corridor's typical days before it.
-- Demo senders see demo trucks only, and the other way round.
-- ---------------------------------------------------------------------------------------------------
create function public.day_availability(p_org uuid, p_from uuid, p_to uuid, p_days int default 7)
returns table (day date, truck_type_id uuid, free int)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_corridor public.corridors;
  v_demo boolean;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not public.can_in_org(p_org, 'book') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_corridor from public.corridors
  where active and ((city_a_id = p_from and city_b_id = p_to) or (city_a_id = p_to and city_b_id = p_from));
  if v_corridor.id is null then
    return;
  end if;
  select coalesce(is_demo, false) into v_demo from public.organizations where id = p_org;
  return query
  select d::date, tt.id,
    (select count(*)::int from public.trucks t join public.organizations o on o.id = t.org_id
     where t.truck_type_id = tt.id and t.status = 'active' and t.approved_at is not null
       and coalesce(o.is_demo, false) = v_demo
       and v_corridor.id = any (case when cardinality(t.corridor_ids) > 0 then t.corridor_ids else o.corridor_ids end)
       and not (t.availability = 'unavailable' and (t.unavailable_until is null or t.unavailable_until >= d::date))
       and not exists (
         select 1 from public.trips tr join public.loads l on l.id = tr.load_id
         where tr.truck_id = t.id and tr.status not in ('cancelled', 'closed', 'delivered', 'delivered_with_exception', 'transloading')
           and (l.pickup_from at time zone 'Africa/Lagos')::date between d::date - greatest(1, ceil(v_corridor.typical_hours / 24.0)::int) and d::date))
  from generate_series(v_today, v_today + greatest(1, least(p_days, 30)) - 1, interval '1 day') d
  cross join public.truck_types tt
  where tt.active;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Post a load (S-02; D046, D047, D055). p_stops: [{"city", "address", "name", "phone"}], the pickup then
-- one to four drop-offs. p_items: [{"goods", "description", "weight_kg", "quantity", "unit",
-- "unit_weight_kg", "value_kobo"}], one to ten. p_offer_total_kobo: the sender's own price, fee included.
-- ---------------------------------------------------------------------------------------------------
drop function public.create_load(uuid, uuid, text, uuid, int, int, text, bigint, timestamptz, timestamptz, jsonb, text);

create function public.create_load(
  p_org uuid, p_truck_type uuid, p_pickup_from timestamptz, p_pickup_until timestamptz, p_stops jsonb, p_items jsonb,
  p_notes text default null, p_offer_total_kobo bigint default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
  v_price record;
  v_count int := jsonb_array_length(coalesce(p_stops, '[]'::jsonb));
  v_items int := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  v_from uuid;
  v_to uuid;
  v_type public.truck_types;
  v_stop jsonb;
  v_item jsonb;
  v_i int := 0;
  v_goods uuid;
  v_livestock boolean;
  v_weight int;
  v_total_weight bigint := 0;
  v_weight_known boolean := true;
  v_value bigint := 0;
  v_split record;
  v_freight bigint;
  v_fee bigint;
  v_offer bigint;
begin
  if not public.can_in_org(p_org, 'book') or not exists (select 1 from public.organizations where id = p_org and kind = 'shipper') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_count < 2 or v_count > 1 + (private.setting('max_dropoffs'))::int then
    raise exception 'a pickup and one to four drop-offs' using errcode = '22023';
  end if;
  if v_items < 1 or v_items > 10 then
    raise exception 'one to ten items' using errcode = '22023';
  end if;
  v_from := (p_stops -> 0 ->> 'city')::uuid;
  v_to := (p_stops -> (v_count - 1) ->> 'city')::uuid;
  select * into v_type from public.truck_types where id = p_truck_type and active;
  if v_type.id is null then
    raise exception 'unknown truck type' using errcode = '22023';
  end if;
  -- Each item: known goods, livestock counted in head, a weight or an amount (D046).
  for v_item in select * from jsonb_array_elements(p_items) loop
    select g.code = 'livestock' into v_livestock from public.goods_categories g where g.id = (v_item ->> 'goods')::uuid and not g.is_banned;
    if v_livestock is null then
      raise exception 'unknown goods' using errcode = '22023';
    end if;
    if v_livestock and (v_item ->> 'quantity' is null or v_item ->> 'unit' is distinct from 'head') then
      raise exception 'how many animals' using errcode = '22023';
    end if;
    if not v_livestock and v_item ->> 'unit' = 'head' then
      raise exception 'head counts are for livestock' using errcode = '22023';
    end if;
    if coalesce((v_item ->> 'value_kobo')::bigint, 0) < 0 then
      raise exception 'a value can''t be negative' using errcode = '22023';
    end if;
    v_weight := coalesce((v_item ->> 'weight_kg')::int,
      case when v_item ->> 'unit' = 'tonnes' then (v_item ->> 'quantity')::int * 1000 end,
      (v_item ->> 'quantity')::int * (v_item ->> 'unit_weight_kg')::int);
    if v_weight is null then
      v_weight_known := false;
    else
      v_total_weight := v_total_weight + v_weight;
    end if;
    v_value := v_value + coalesce((v_item ->> 'value_kobo')::bigint, 0);
    v_goods := coalesce(v_goods, (v_item ->> 'goods')::uuid);
  end loop;
  if v_total_weight > v_type.capacity_kg_max then
    raise exception 'too heavy for that truck type' using errcode = '22023';
  end if;
  if p_pickup_until <= p_pickup_from or p_pickup_from < now() - interval '1 hour' then
    raise exception 'choose a loading time from now on' using errcode = '22023';
  end if;
  select * into v_price from private.price(p_org, v_from, v_to, p_truck_type, v_count - 1);
  if v_price.freight_kobo is null then
    raise exception 'we don''t cover this route yet' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_stops) st
    join public.cities ci on ci.id = (st ->> 'city')::uuid
    join public.corridors co on co.id = v_price.corridor_id
    where ci.id not in (co.city_a_id, co.city_b_id) and not (ci.name = any (co.via))
  ) then
    raise exception 'every stop must be on the route' using errcode = '22023';
  end if;
  v_freight := v_price.freight_kobo;
  v_fee := v_price.fee_kobo;
  -- D047: an offer is between the floor and our price, in ₦1,000 steps; at or above our price it is
  -- simply a booking at our price.
  if p_offer_total_kobo is not null and p_offer_total_kobo < v_price.total_kobo then
    if p_offer_total_kobo % 100000 <> 0 or p_offer_total_kobo < private.offer_floor(v_price.total_kobo) then
      raise exception 'an offer is at least the lowest offer shown, in whole thousands of naira' using errcode = '22023';
    end if;
    select * into v_split from private.offer_split(p_offer_total_kobo, v_price.fee_bps);
    v_freight := v_split.freight_kobo;
    v_fee := v_split.fee_kobo;
    v_offer := p_offer_total_kobo;
  end if;
  insert into public.loads (ref, shipper_org_id, created_by, corridor_id, from_city_id, to_city_id, goods_category_id, goods_description,
    weight_kg, declared_value_kobo, truck_type_id, pickup_from, pickup_until,
    freight_kobo, fee_bps, fee_kobo, total_kobo, list_freight_kobo, offer_total_kobo, notes_for_driver, is_demo)
  values (private.new_ref(), p_org, v_user, v_price.corridor_id, v_from, v_to, v_goods,
    left((select string_agg(btrim(i ->> 'description'), ' · ') from jsonb_array_elements(p_items) i), 120),
    case when v_weight_known and v_total_weight > 0 then v_total_weight::int end, v_value, p_truck_type, p_pickup_from, p_pickup_until,
    v_freight, v_price.fee_bps, v_fee, v_freight + v_fee,
    case when v_offer is not null then v_price.freight_kobo end, v_offer,
    nullif(btrim(p_notes), ''), coalesce((select is_demo from public.organizations where id = p_org), false))
  returning id into v_id;
  for v_stop in select * from jsonb_array_elements(p_stops) loop
    insert into public.load_stops (load_id, seq, kind, city_id, address_text, contact_name, contact_phone)
    values (v_id, v_i, case when v_i = 0 then 'pickup' else 'dropoff' end, (v_stop ->> 'city')::uuid, btrim(v_stop ->> 'address'),
      nullif(btrim(v_stop ->> 'name'), ''), nullif(btrim(v_stop ->> 'phone'), ''));
    v_i := v_i + 1;
  end loop;
  v_i := 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.load_items (load_id, seq, goods_category_id, description, weight_kg, quantity, quantity_unit, unit_weight_kg, declared_value_kobo)
    values (v_id, v_i, (v_item ->> 'goods')::uuid, btrim(v_item ->> 'description'), (v_item ->> 'weight_kg')::int,
      (v_item ->> 'quantity')::int, nullif(v_item ->> 'unit', ''), (v_item ->> 'unit_weight_kg')::int, coalesce((v_item ->> 'value_kobo')::bigint, 0));
    v_i := v_i + 1;
  end loop;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Paying recomputes the price (SYSTEM-LOGIC §3.1). An offer keeps its total; if our price fell to or
-- below it, it becomes a booking at our price; if our price rose so far that the offer is under the new
-- floor, the sender must choose again.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.request_load_payment(p_load uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_load public.loads;
  v_price record;
  v_split record;
  v_payment uuid;
  v_dropoffs int;
  v_freight bigint;
  v_fee bigint;
  v_list bigint;
  v_offer bigint;
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
  select count(*) - 1 into v_dropoffs from public.load_stops where load_id = p_load;
  select * into v_price from private.price(v_load.shipper_org_id, v_load.from_city_id, v_load.to_city_id, v_load.truck_type_id, v_dropoffs);
  if v_price.freight_kobo is null then
    raise exception 'we don''t cover this route yet' using errcode = 'P0002';
  end if;
  v_freight := v_price.freight_kobo;
  v_fee := v_price.fee_kobo;
  if v_load.offer_total_kobo is not null and v_load.offer_total_kobo < v_price.total_kobo then
    if v_load.offer_total_kobo < private.offer_floor(v_price.total_kobo) then
      raise exception 'our price changed: choose your offer again' using errcode = '22023';
    end if;
    select * into v_split from private.offer_split(v_load.offer_total_kobo, v_price.fee_bps);
    v_freight := v_split.freight_kobo;
    v_fee := v_split.fee_kobo;
    v_list := v_price.freight_kobo;
    v_offer := v_load.offer_total_kobo;
  end if;
  update public.loads set status = 'awaiting_payment', freight_kobo = v_freight, fee_bps = v_price.fee_bps, fee_kobo = v_fee,
    total_kobo = v_freight + v_fee, list_freight_kobo = v_list, offer_total_kobo = v_offer, updated_at = now() where id = p_load;
  insert into public.payments (purpose, shipper_org_id, load_id, amount_kobo, expires_at, created_by)
  values ('load', v_load.shipper_org_id, p_load, v_freight + v_fee, now() + make_interval(hours => (private.setting('payment_expiry_hours'))::int), v_user)
  returning id into v_payment;
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- T-06 counters: on an offered load the owner's reply is measured from our price, not the offer
-- (D047: "reply with their own price"), so an owner can ask for our price or up to counter_max_bps more.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.counter_load(p_load uuid, p_truck uuid, p_amount_kobo bigint, p_driver uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_org uuid;
  v_load public.loads;
  v_base bigint;
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
  v_base := coalesce(v_load.list_freight_kobo, v_load.freight_kobo);
  p_amount_kobo := private.round_to(p_amount_kobo, 100000);
  if p_amount_kobo is null or p_amount_kobo <= v_load.freight_kobo or p_amount_kobo > v_base + v_base * (private.setting('counter_max_bps'))::bigint / 10000 then
    raise exception 'a counter is above the price and at most 20 percent more' using errcode = '22023';
  end if;
  insert into public.offers (load_id, transporter_org_id, truck_id, driver_id, kind, amount_kobo, expires_at, created_by)
  values (p_load, v_org, p_truck, p_driver, 'counter', p_amount_kobo, now() + make_interval(hours => (private.setting('counter_expiry_hours'))::int), v_user)
  returning id into v_id;
  return v_id;
end;
$$;

-- What the sender pays on top to move a load from its freight to p_freight: the difference and the fee on it.
create function private.top_up_for(p_load public.loads, p_freight bigint) returns bigint language sql immutable set search_path = '' as $$
  select (p_freight - p_load.freight_kobo) + private.round_to((p_freight - p_load.freight_kobo) * p_load.fee_bps / 10000.0, 10000);
$$;

-- S-07 accept a counter: re-declared so the top-up uses the shared rule.
create or replace function public.accept_counter(p_offer uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_offer public.offers;
  v_load public.loads;
  v_payment uuid;
begin
  select * into v_offer from public.offers where id = p_offer for update;
  select * into v_load from public.loads where id = v_offer.load_id;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'decide_offers') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_offer.kind <> 'counter' or v_offer.status <> 'pending' or v_offer.expires_at < now() or v_load.status <> 'funded' or v_offer.amount_kobo <= v_load.freight_kobo then
    raise exception 'this offer has closed' using errcode = '22023';
  end if;
  insert into public.payments (purpose, shipper_org_id, load_id, offer_id, amount_kobo, expires_at, created_by)
  values ('top_up', v_load.shipper_org_id, v_load.id, p_offer, private.top_up_for(v_load, v_offer.amount_kobo), v_offer.expires_at, v_user)
  returning id into v_payment;
  update public.offers set status = 'awaiting_top_up', top_up_payment_id = v_payment where id = p_offer;
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- P11d Offer again: once per owner, a total between the sender's offer and the owner's reply. The owner
-- has reoffer_reply_minutes to answer. Nothing is paid now; if they accept, the sender pays the difference.
-- ---------------------------------------------------------------------------------------------------
create function public.reoffer_counter(p_counter uuid, p_total_kobo bigint) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_counter public.offers;
  v_load public.loads;
  v_split record;
  v_counter_total bigint;
  v_id uuid;
begin
  select * into v_counter from public.offers where id = p_counter;
  -- The load row is the lock: two "offer again" taps can't both pass the once-per-owner check. The reply
  -- is then locked and read again, so it can't be accepted at the same moment (money review).
  select * into v_load from public.loads where id = v_counter.load_id for update;
  select * into v_counter from public.offers where id = p_counter for update;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'decide_offers') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_counter.kind <> 'counter' or v_counter.status <> 'pending' or v_counter.expires_at <= now() or v_load.status <> 'funded' then
    raise exception 'this reply has closed' using errcode = '22023';
  end if;
  if exists (select 1 from public.offers where load_id = v_load.id and transporter_org_id = v_counter.transporter_org_id and kind = 'reoffer') then
    raise exception 'you can offer again once to each owner' using errcode = '22023';
  end if;
  v_counter_total := v_load.total_kobo + private.top_up_for(v_load, v_counter.amount_kobo);
  if p_total_kobo is null or p_total_kobo % 100000 <> 0 or p_total_kobo <= v_load.total_kobo or p_total_kobo >= v_counter_total then
    raise exception 'a new offer is between your offer and their price, in whole thousands of naira' using errcode = '22023';
  end if;
  -- The new freight keeps the load's fee on the offer and adds the fee on the difference, as a top-up does.
  select * into v_split from private.offer_split(p_total_kobo - v_load.total_kobo, v_load.fee_bps);
  update public.offers set status = 'declined' where id = p_counter;
  insert into public.offers (load_id, transporter_org_id, truck_id, driver_id, kind, amount_kobo, expires_at, created_by)
  values (v_load.id, v_counter.transporter_org_id, v_counter.truck_id, v_counter.driver_id, 'reoffer',
    v_load.freight_kobo + v_split.freight_kobo, now() + make_interval(mins => (private.setting('reoffer_reply_minutes'))::int), v_user)
  returning id into v_id;
  return v_id;
end;
$$;

-- The owner answers a second offer. Accepting asks the sender for the difference (a top-up); the trip is
-- made when it is paid in full (confirm_payment), as with an accepted counter.
create function public.answer_reoffer(p_offer uuid, p_accept boolean) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_offer public.offers;
  v_load public.loads;
  v_payment uuid;
begin
  select * into v_offer from public.offers where id = p_offer for update;
  if v_offer.id is null or v_offer.kind <> 'reoffer' or not public.can_in_org(v_offer.transporter_org_id, 'load_board') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_load from public.loads where id = v_offer.load_id;
  if v_offer.status <> 'pending' or v_offer.expires_at <= now() or v_load.status <> 'funded' then
    update public.offers set status = 'expired' where id = p_offer and status = 'pending';
    raise exception 'this offer has closed' using errcode = '22023';
  end if;
  if not p_accept then
    update public.offers set status = 'declined' where id = p_offer;
    return null;
  end if;
  insert into public.payments (purpose, shipper_org_id, load_id, offer_id, amount_kobo, expires_at, created_by)
  values ('top_up', v_load.shipper_org_id, v_load.id, p_offer, private.top_up_for(v_load, v_offer.amount_kobo),
    now() + make_interval(hours => (private.setting('counter_expiry_hours'))::int), v_user)
  returning id into v_payment;
  update public.offers set status = 'awaiting_top_up', top_up_payment_id = v_payment,
    expires_at = now() + make_interval(hours => (private.setting('counter_expiry_hours'))::int) where id = p_offer;
  return v_payment;
end;
$$;

-- accept_offer: a second offer, like a counter, can't be taken after it expires (its top-up is refunded).
create or replace function private.accept_offer(p_offer uuid, p_by uuid) returns uuid language plpgsql security definer set search_path = '' as $$
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
  if v_offer.status not in ('pending', 'awaiting_top_up') or (v_offer.kind in ('counter', 'reoffer') and coalesce(v_offer.expires_at, '-infinity'::timestamptz) <= now()) then
    update public.offers set status = 'expired' where id = p_offer;
    raise exception 'this offer has expired' using errcode = '22023';
  end if;
  if v_load.status <> 'funded' then
    update public.offers set status = 'expired' where id = p_offer and status in ('pending', 'awaiting_top_up');
    raise exception 'this load was just taken' using errcode = '40001';
  end if;
  select * into v_truck from public.trucks where id = v_offer.truck_id;
  if v_truck.id is null or v_truck.org_id <> v_offer.transporter_org_id or v_truck.status <> 'active' then
    raise exception 'choose an active truck' using errcode = '22023';
  end if;
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

-- What has already gone back for one payment (its per-event surpluses and its whole-payment refunds), so a
-- payment that can no longer apply is refunded in full exactly once (money review).
create function private.payment_refunded(p_payment uuid) returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum(r.amount_kobo), 0)::bigint from public.refunds r
  where r.idempotency_key in (select 'surplus:' || e.provider_event_id from private.payment_events e where e.payment_id = p_payment)
     or r.idempotency_key in ('topup-failed:' || p_payment, 'closed:' || p_payment);
$$;

-- Closes a load's open replies (pending, or accepted and waiting for the sender's top-up) and gives back
-- anything already paid towards those top-ups (money review: a day change or a raise ends them).
create function private.close_replies(p_load uuid, p_max_amount bigint default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pay record;
  v_back bigint;
begin
  for v_pay in
    select p.id, p.received_kobo from public.offers o join public.payments p on p.id = o.top_up_payment_id
    where o.load_id = p_load and o.status = 'awaiting_top_up' and (p_max_amount is null or o.amount_kobo <= p_max_amount)
    for update of p
  loop
    update public.payments set status = 'expired' where id = v_pay.id and status = 'pending';
    v_back := v_pay.received_kobo - private.payment_refunded(v_pay.id);
    if v_back > 0 then
      perform private.queue_refund(p_load, least(v_back, private.ledger_balance(private.ledger_account('escrow', null, p_load))), 'The reply closed before it was paid in full', 'closed:' || v_pay.id);
    end if;
  end loop;
  update public.offers set status = 'expired'
  where load_id = p_load and status in ('pending', 'awaiting_top_up') and (p_max_amount is null or amount_kobo <= p_max_amount);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- P11c No truck yet: raise the price (paid now, applied only when paid in full), change the pick-up day,
-- or keep waiting. A full refund is cancel_load.
-- ---------------------------------------------------------------------------------------------------
create function public.raise_load_price(p_load uuid, p_total_kobo bigint) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_load public.loads;
  v_split record;
  v_payment uuid;
  v_old record;
  v_back bigint;
begin
  -- One lock order everywhere money moves: the load, then its payments (money review).
  select * into v_load from public.loads where id = p_load for update;
  perform 1 from public.payments where load_id = p_load and purpose = 'raise' and status = 'pending' for update;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'pay') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_load.status <> 'funded' then
    raise exception 'only a paid booking waiting for a truck can be raised' using errcode = '22023';
  end if;
  if p_total_kobo is null or p_total_kobo % 100000 <> 0 or p_total_kobo <= v_load.total_kobo or p_total_kobo > v_load.total_kobo * 2 then
    raise exception 'a raise is above your price, in whole thousands of naira' using errcode = '22023';
  end if;
  -- One raise at a time: an earlier one not yet paid in full is replaced, and anything paid towards it goes back.
  for v_old in select id, received_kobo from public.payments where load_id = p_load and purpose = 'raise' and status = 'pending' loop
    update public.payments set status = 'expired' where id = v_old.id;
    v_back := v_old.received_kobo - private.payment_refunded(v_old.id);
    if v_back > 0 then
      perform private.queue_refund(p_load, v_back, 'A newer raise replaced this one', 'closed:' || v_old.id);
    end if;
  end loop;
  select * into v_split from private.offer_split(p_total_kobo, v_load.fee_bps);
  insert into public.payments (purpose, shipper_org_id, load_id, amount_kobo, expires_at, created_by, raise_freight_kobo, raise_fee_kobo)
  values ('raise', v_load.shipper_org_id, p_load, p_total_kobo - v_load.total_kobo,
    now() + make_interval(hours => (private.setting('payment_expiry_hours'))::int), v_user, v_split.freight_kobo, v_split.fee_kobo)
  returning id into v_payment;
  return v_payment;
end;
$$;

create function public.change_load_day(p_load uuid, p_pickup_from timestamptz, p_pickup_until timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_load public.loads;
begin
  select * into v_load from public.loads where id = p_load for update;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'book') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_load.status not in ('draft', 'funded') then
    raise exception 'the day can change before a truck is assigned' using errcode = '22023';
  end if;
  if p_pickup_until <= p_pickup_from or p_pickup_from < now() - interval '1 hour' or p_pickup_from > now() + interval '30 days' then
    raise exception 'choose a loading time in the next 30 days' using errcode = '22023';
  end if;
  update public.loads set pickup_from = p_pickup_from, pickup_until = p_pickup_until,
    no_truck_decision_due_at = case when status = 'funded' then now() + make_interval(hours => (private.setting('no_truck_decision_hours'))::int) end,
    updated_at = now() where id = p_load;
  -- Replies were for the old day, including ones waiting for their top-up (money review).
  perform private.close_replies(p_load);
end;
$$;

create function public.keep_waiting(p_load uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.loads where id = p_load and public.can_in_org(shipper_org_id, 'book')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.loads set no_truck_decision_due_at = now() + make_interval(hours => (private.setting('no_truck_decision_hours'))::int), updated_at = now()
  where id = p_load and status = 'funded';
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- confirm_payment, with the raise: money for a raise goes into the load's escrow; the load takes the new
-- price only when the raise is paid in full, and a raise that can no longer apply is refunded whole.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.confirm_payment(p_provider_ref text, p_event_id text, p_amount_kobo bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_pay public.payments;
  v_load public.loads;
  v_escrow uuid;
  v_held bigint;
  v_needed bigint;
  v_extra bigint := 0;
  v_received bigint;
  v_load_id uuid;
begin
  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'amount must be positive' using errcode = '22023';
  end if;
  -- One lock order everywhere money moves: the load, then its payments (money review). A payment's load
  -- never changes, so reading it first without a lock is safe.
  select load_id into v_load_id from public.payments where provider_ref = p_provider_ref;
  if v_load_id is null then
    raise exception 'unknown payment' using errcode = 'P0002';
  end if;
  select * into v_load from public.loads where id = v_load_id for update;
  select * into v_pay from public.payments where provider_ref = p_provider_ref for update;
  if exists (select 1 from private.payment_events where provider_event_id = p_event_id) then
    return 'duplicate';
  end if;
  insert into private.payment_events (provider_event_id, payment_id, amount_kobo) values (p_event_id, v_pay.id, p_amount_kobo);
  v_escrow := private.ledger_account('escrow', null, v_load.id);
  perform private.post_ledger('fund_load', 'pay:' || p_event_id,
    jsonb_build_array(
      jsonb_build_object('account', private.ledger_account('provider_cash'), 'debit', p_amount_kobo),
      jsonb_build_object('account', v_escrow, 'credit', p_amount_kobo)),
    v_load.id, null, 'Payment received ' || v_pay.id);
  update public.payments set received_kobo = received_kobo + p_amount_kobo, received_at = now(),
    status = case when received_kobo + p_amount_kobo >= amount_kobo then 'received'::public.payment_status else status end
  where id = v_pay.id
  returning received_kobo into v_received;

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
  elsif v_pay.purpose = 'top_up' then
    if v_load.status <> 'funded' or v_pay.status <> 'pending' or not exists (select 1 from public.offers where id = v_pay.offer_id and status = 'awaiting_top_up') then
      -- Everything paid towards a closed top-up goes back once, earlier parts too (money review).
      v_extra := least(v_held, v_received - case when v_pay.applied_at is not null then v_pay.amount_kobo else 0 end - private.payment_refunded(v_pay.id));
    elsif v_received < v_pay.amount_kobo then
      return 'partial';
    else
      begin
        perform private.accept_offer(v_pay.offer_id, null);
        update public.payments set applied_at = now() where id = v_pay.id;
      exception when others then
        update public.offers set status = 'expired' where id = v_pay.offer_id;
        perform private.queue_refund(v_load.id, least(v_held, v_received), 'The offer could not go ahead', 'topup-failed:' || v_pay.id);
        return 'refunded';
      end;
      v_extra := v_received - v_pay.amount_kobo;
    end if;
  elsif v_pay.purpose = 'raise' then
    -- A raise only applies to a paid load still waiting for a truck, and only once (review: a second
    -- event for the same raise after it applied is surplus, never a second raise).
    -- v_pay is read before this event: only a raise still pending, and still a rise, can apply (money
    -- review: a replaced raise paid late, or a raise already applied, is refunded in full instead).
    if v_load.status <> 'funded' or v_pay.status <> 'pending' or v_pay.raise_freight_kobo + v_pay.raise_fee_kobo <= v_load.total_kobo then
      v_extra := least(v_held, v_received - case when v_pay.applied_at is not null then v_pay.amount_kobo else 0 end - private.payment_refunded(v_pay.id));
    elsif v_received < v_pay.amount_kobo then
      return 'partial';
    else
      update public.loads set freight_kobo = v_pay.raise_freight_kobo, fee_kobo = v_pay.raise_fee_kobo,
        total_kobo = v_pay.raise_freight_kobo + v_pay.raise_fee_kobo,
        list_freight_kobo = case when list_freight_kobo is not null and v_pay.raise_freight_kobo < list_freight_kobo then list_freight_kobo end,
        offer_total_kobo = case when list_freight_kobo is not null and v_pay.raise_freight_kobo < list_freight_kobo then v_pay.raise_freight_kobo + v_pay.raise_fee_kobo end,
        no_truck_decision_due_at = now() + make_interval(hours => (private.setting('no_truck_decision_hours'))::int), updated_at = now()
      where id = v_load.id;
      -- Replies at or below the new price are no longer replies, even ones waiting for a top-up (money review).
      perform private.close_replies(v_load.id, v_pay.raise_freight_kobo);
      update public.payments set applied_at = now() where id = v_pay.id;
      v_extra := v_received - v_pay.amount_kobo;
    end if;
  else
    v_extra := least(v_held, p_amount_kobo);
  end if;
  if v_extra > 0 then
    perform private.queue_refund(v_load.id, v_extra, 'Paid more than the price', 'surplus:' || p_event_id);
  end if;
  return 'funded';
end;
$$;

-- P11d: what the sender would pay on top if the owner accepts a second offer of p_total_kobo, by the same
-- rule as the top-up itself, so the screen shows exactly what will be charged.
create function public.reoffer_quote(p_counter uuid, p_total_kobo bigint) returns bigint language plpgsql stable security definer set search_path = '' as $$
declare
  v_load public.loads;
  v_split record;
begin
  select l.* into v_load from public.offers o join public.loads l on l.id = o.load_id where o.id = p_counter;
  if v_load.id is null or not public.can_in_org(v_load.shipper_org_id, 'decide_offers') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_total_kobo is null or p_total_kobo <= v_load.total_kobo then
    return 0;
  end if;
  select * into v_split from private.offer_split(p_total_kobo - v_load.total_kobo, v_load.fee_bps);
  return private.top_up_for(v_load, v_load.freight_kobo + v_split.freight_kobo);
end;
$$;

-- Who may call what (as in the Phase 3 migration): people through their permissions, the server for
-- provider events, nobody for the private helpers.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.quote_booking(uuid, uuid, uuid, uuid, int)',
    'public.day_availability(uuid, uuid, uuid, int)',
    'public.create_load(uuid, uuid, timestamptz, timestamptz, jsonb, jsonb, text, bigint)',
    'public.reoffer_counter(uuid, bigint)',
    'public.reoffer_quote(uuid, bigint)',
    'public.answer_reoffer(uuid, boolean)',
    'public.raise_load_price(uuid, bigint)',
    'public.change_load_day(uuid, timestamptz, timestamptz)',
    'public.keep_waiting(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'private.offer_split(bigint, int)', 'private.offer_floor(bigint)', 'private.top_up_for(public.loads, bigint)',
    'private.payment_refunded(uuid)', 'private.close_replies(uuid, bigint)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;
