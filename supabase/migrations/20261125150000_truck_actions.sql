-- Truck detail actions (D045 owner screens): pause or resume a truck, and assign its driver. Owners and
-- admins only (manage_trucks / assign). A truck on a trip can't be paused; a driver can be changed on
-- the current trip only before loading (SYSTEM-LOGIC §3.3: "Assign or change truck and driver (until loaded)").

create function public.set_truck_paused(p_truck uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_truck public.trucks;
begin
  select * into v_truck from public.trucks where id = p_truck for update;
  if v_truck.id is null or not public.can_in_org(v_truck.org_id, 'manage_trucks') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_paused then
    if exists (select 1 from public.trips where truck_id = p_truck and status not in ('closed', 'cancelled')) then
      raise exception 'this truck is on a trip' using errcode = '22023';
    end if;
    if v_truck.status = 'active' then
      update public.trucks set status = 'paused', availability = 'unavailable' where id = p_truck;
    end if;
  elsif v_truck.status = 'paused' then
    update public.trucks set status = 'active', availability = 'available' where id = p_truck;
  end if;
end;
$$;

create function public.assign_truck_driver(p_truck uuid, p_driver uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_truck public.trucks;
begin
  select * into v_truck from public.trucks where id = p_truck for update;
  if v_truck.id is null or not public.can_in_org(v_truck.org_id, 'assign') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_driver is not null and not exists (select 1 from public.drivers where user_id = p_driver and org_id = v_truck.org_id and status = 'active' and not paused) then
    raise exception 'choose one of your active drivers' using errcode = '22023';
  end if;
  update public.trucks set default_driver_id = p_driver where id = p_truck;
  update public.trips set driver_id = p_driver
  where truck_id = p_truck and status in ('assigned', 'to_pickup', 'at_pickup') and loaded_at is null;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.set_truck_paused(uuid, boolean)', 'public.assign_truck_driver(uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
