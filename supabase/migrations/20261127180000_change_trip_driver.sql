-- Combined brief slice 6b (owner O15b "Change driver"): the owner or an Admin hands one trip to another
-- of their active drivers before the goods are loaded (after loading, the driver who signed for the seal
-- stays; a change then is a problem for operations, Phase 5). Both drivers are told; drivers never see
-- money (D003), so the messages carry only the trip.

create function public.change_trip_driver(p_trip uuid, p_driver uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_trip public.trips;
begin
  select * into v_trip from public.trips where id = p_trip for update;
  if v_trip.id is null or not public.can_in_org(v_trip.transporter_org_id, 'assign') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_trip.status not in ('assigned', 'to_pickup', 'at_pickup') or v_trip.loaded_at is not null then
    raise exception 'the driver can change until the goods are loaded' using errcode = '22023';
  end if;
  if not exists (select 1 from public.drivers d join public.organization_members m on m.org_id = d.org_id and m.user_id = d.user_id and m.status = 'active'
    where d.user_id = p_driver and d.org_id = v_trip.transporter_org_id and d.status = 'active' and not d.paused) then
    raise exception 'choose one of your active drivers' using errcode = '22023';
  end if;
  if v_trip.driver_id = p_driver then
    return;
  end if;
  update public.trips set driver_id = p_driver where id = p_trip;
  insert into public.trip_events (trip_id, type, actor_user_id, actor_kind, payload)
  values (p_trip, 'driver_changed', v_user, 'owner', jsonb_build_object('from', v_trip.driver_id, 'to', p_driver, 'reason', left(nullif(btrim(p_reason), ''), 200)));
  perform private.notify('trip.driver_assigned', 'driver_assigned', array['in_app', 'push']::public.notify_channel[],
    jsonb_build_object('trip', p_trip), p_driver, null, null, 'driver-assigned:' || p_trip || ':' || p_driver, p_trip);
  if v_trip.driver_id is not null then
    perform private.notify('trip.driver_removed', 'driver_removed', array['in_app', 'push']::public.notify_channel[],
      jsonb_build_object('trip', p_trip), v_trip.driver_id, null, null, 'driver-removed:' || p_trip || ':' || v_trip.driver_id, p_trip);
  end if;
end;
$$;

revoke all on function public.change_trip_driver(uuid, uuid, text) from public, anon;
grant execute on function public.change_trip_driver(uuid, uuid, text) to authenticated;
