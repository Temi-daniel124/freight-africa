-- Review: a counter's top-up that arrives after the counter expired is refunded, never accepted.
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
  -- A counter accepted after it expired is refused; confirm_payment then refunds the top-up (review).
  if v_offer.kind = 'counter' and v_offer.expires_at < now() then
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
