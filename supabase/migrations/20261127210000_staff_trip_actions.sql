-- Slice 8b (admin-mockups X03b): every staff change to a trip opens a dialog with a required reason that
-- goes to the audit log (combined brief 5d). staff_trip_action is the reasoned form of staff_trip_step
-- for the console (operations and super admins, two-step sign-in), and staff_trip_note adds a line to
-- the trip's activity. Staff never see or set loading or delivery codes here.

create function public.staff_trip_action(p_trip uuid, p_step text, p_reason text, p_weight_kg int default null, p_quantity int default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_status text;
begin
  if not (coalesce(public.my_staff_role()::text, '') in ('operations', 'super_admin') and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception 'a reason of 5 to 500 characters' using errcode = '22023';
  end if;
  select status::text into v_status from public.trips where id = p_trip for update;
  if v_status is null then
    raise exception 'no such trip' using errcode = 'P0002';
  end if;
  if p_step = 'loaded' then
    perform private.trip_loaded(p_trip, v_user, p_weight_kg, p_quantity);
  elsif p_step = 'delivered' then
    perform private.trip_delivered(p_trip, v_user);
  elsif p_step = 'release' then
    perform private.release_balance(p_trip, false);
  else
    raise exception 'loaded, delivered or release' using errcode = '22023';
  end if;
  insert into public.trip_events (trip_id, type, actor_user_id, actor_kind, payload)
  values (p_trip, 'staff.' || p_step, v_user, 'staff', jsonb_build_object('reason', btrim(p_reason)));
  perform private.audit('trip.' || p_step, 'trips', p_trip::text, jsonb_build_object('status', v_status), jsonb_build_object('reason', btrim(p_reason)));
end;
$$;

create function public.staff_trip_note(p_trip uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not (coalesce(public.my_staff_role()::text, '') in ('operations', 'super_admin', 'support', 'finance') and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 2 and 1000 then
    raise exception 'a note of 2 to 1000 characters' using errcode = '22023';
  end if;
  if not exists (select 1 from public.trips where id = p_trip) then
    raise exception 'no such trip' using errcode = 'P0002';
  end if;
  insert into public.trip_events (trip_id, type, actor_user_id, actor_kind, payload)
  values (p_trip, 'staff.note', v_user, 'staff', jsonb_build_object('note', btrim(p_note)));
end;
$$;

revoke all on function public.staff_trip_action(uuid, text, text, int, int) from public, anon;
grant execute on function public.staff_trip_action(uuid, text, text, int, int) to authenticated;
revoke all on function public.staff_trip_note(uuid, text) from public, anon;
grant execute on function public.staff_trip_note(uuid, text) to authenticated;
