-- D045 trip tracking: what the map and its sheet show for one trip, to the people who may see it.
-- Coordinates come out as numbers (the app can't read PostGIS values). The driver's phone is shown
-- only during a live trip (D018) and only to sender members with see_trip_phones, or the trip's own
-- truck business; the money held only to senders with see_money or pay. Drivers never see money (D003).

create function public.trip_map(p_trip uuid) returns table (
  ref text, status text, load_status text, goods text, weight_kg int, quantity int, quantity_unit text,
  from_city text, to_city text, from_lat float8, from_lng float8, to_lat float8, to_lng float8,
  truck_lat float8, truck_lng float8, last_ping_at timestamptz, pickup_from timestamptz, delivered_at timestamptz,
  plate text, truck_type text, truck_type_code text, capacity_kg int,
  driver_first_name text, driver_avatar text, driver_phone text, held_kobo bigint,
  next_contact_name text, next_contact_phone text
) language plpgsql stable security definer set search_path = '' as $$
declare
  v_trip public.trips;
  v_load public.loads;
  v_sender boolean;
  v_carrier boolean;
  v_live boolean;
begin
  select * into v_trip from public.trips where id = p_trip;
  if v_trip.id is null then
    return;
  end if;
  select * into v_load from public.loads where id = v_trip.load_id;
  v_sender := public.can_in_org(v_load.shipper_org_id, 'view_trips');
  -- A driver counts only while still an active member of the business (review).
  v_carrier := public.can_in_org(v_trip.transporter_org_id, 'load_board') or (v_trip.driver_id = (select auth.uid()) and public.can_in_org(v_trip.transporter_org_id, 'view_trips'));
  if not (v_sender or v_carrier or public.is_staff()) then
    return;
  end if;
  v_live := v_trip.status in ('assigned', 'to_pickup', 'at_pickup', 'loading', 'loaded', 'in_transit', 'arrived');
  return query
  select v_load.ref, v_trip.status::text, v_load.status::text, g.name, v_load.weight_kg, v_load.quantity, v_load.quantity_unit,
    fc.name, tc.name,
    extensions.st_y(fc.location::extensions.geometry), extensions.st_x(fc.location::extensions.geometry),
    extensions.st_y(tc.location::extensions.geometry), extensions.st_x(tc.location::extensions.geometry),
    extensions.st_y(v_trip.last_location::extensions.geometry), extensions.st_x(v_trip.last_location::extensions.geometry),
    v_trip.last_ping_at, v_load.pickup_from, v_trip.delivered_at,
    tr.plate_number, tt.name, tt.code, tr.capacity_kg,
    split_part(coalesce(p.full_name, ''), ' ', 1), p.avatar_key,
    case when v_live and ((v_sender and public.can_in_org(v_load.shipper_org_id, 'see_trip_phones')) or public.can_in_org(v_trip.transporter_org_id, 'load_board')) then p.phone end,
    case when v_sender and (public.can_in_org(v_load.shipper_org_id, 'see_money') or public.can_in_org(v_load.shipper_org_id, 'pay')) and v_trip.status <> 'closed'
      then private.ledger_balance(private.ledger_account('escrow', null, v_load.id)) end,
    -- The next stop's contact (pickup before loading, then the receiver) for the truck side during a live trip.
    case when v_live and v_carrier then ns.contact_name end,
    case when v_live and v_carrier then ns.contact_phone end
  from public.cities fc, public.cities tc, public.goods_categories g, public.trucks tr, public.truck_types tt
  left join public.profiles p on p.id = v_trip.driver_id
  left join lateral (
    select st.contact_name, st.contact_phone from public.load_stops st
    where st.load_id = v_load.id and st.seq = case when v_trip.loaded_at is null then 0 else (select max(seq) from public.load_stops where load_id = v_load.id) end
  ) ns on true
  where fc.id = v_load.from_city_id and tc.id = v_load.to_city_id and g.id = v_load.goods_category_id and tr.id = v_trip.truck_id and tt.id = tr.truck_type_id;
end;
$$;
revoke all on function public.trip_map(uuid) from public, anon;
grant execute on function public.trip_map(uuid) to authenticated;

-- D045 Track a trip: find a trip by reference, only within the signed-in person's business.
create function public.find_trip(p_org uuid, p_ref text) returns uuid language sql stable security definer set search_path = '' as $$
  select l.id from public.loads l
  where l.shipper_org_id = p_org and public.can_in_org(p_org, 'view_trips') and upper(btrim(l.ref)) = upper(btrim(p_ref))
  limit 1;
$$;
revoke all on function public.find_trip(uuid, text) from public, anon;
grant execute on function public.find_trip(uuid, text) to authenticated;

-- D045 truck owner Home and truck detail: every truck with its status, driver, current trip and load
-- (D046) and last position. Owners and admins only (load_board); no money here.
create function public.fleet(p_org uuid) returns table (
  truck_id uuid, plate text, truck_type text, truck_type_code text, capacity_kg int, status text, availability text,
  driver_name text, driver_avatar text, trip_id uuid, trip_ref text, trip_status text, from_city text, to_city text,
  goods text, weight_kg int, quantity int, quantity_unit text, lat float8, lng float8, pickup_from timestamptz
) language sql stable security definer set search_path = '' as $$
  select tr.id, tr.plate_number, tt.name, tt.code, tr.capacity_kg, tr.status::text, tr.availability::text,
    p.full_name, p.avatar_key, t.id, t.ref, t.status::text, fc.name, tc.name, g.name, l.weight_kg, l.quantity, l.quantity_unit,
    extensions.st_y(coalesce(t.last_location, fc.location)::extensions.geometry), extensions.st_x(coalesce(t.last_location, fc.location)::extensions.geometry),
    l.pickup_from
  from public.trucks tr
  join public.truck_types tt on tt.id = tr.truck_type_id
  left join lateral (
    select * from public.trips x where x.truck_id = tr.id and x.status not in ('closed', 'cancelled') order by x.created_at desc limit 1
  ) t on true
  left join public.loads l on l.id = t.load_id
  left join public.cities fc on fc.id = l.from_city_id
  left join public.cities tc on tc.id = l.to_city_id
  left join public.goods_categories g on g.id = l.goods_category_id
  left join public.profiles p on p.id = coalesce(t.driver_id, tr.default_driver_id)
  where tr.org_id = p_org and tr.status <> 'retired' and public.can_in_org(p_org, 'load_board')
  order by (t.id is null), tr.plate_number;
$$;
revoke all on function public.fleet(uuid) from public, anon;
grant execute on function public.fleet(uuid) to authenticated;
