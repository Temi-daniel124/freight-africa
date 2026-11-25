-- Phase 2 remainder: GPS tracker registration (ux-owner.md T-18) and truck inspection tasks for field
-- agents (ux-admin.md X-30; DATA-MODEL field_tasks).

-- ---------------------------------------------------------------------------------------------------
-- T-18: an owner or admin connects a tracker to a truck. Trackers send positions to our server
-- (OsmAnd protocol, /api/trackers/osmand); a position updates the truck's last known place and time.
-- ---------------------------------------------------------------------------------------------------
-- A tracker proves itself with a random key set in its server address (never the IMEI alone, which is
-- printed on the device): only the key's hash is stored, and the key is shown to the owner once.
alter table public.trucks add column tracker_key_hash text unique check (tracker_key_hash is null or tracker_key_hash ~ '^[0-9a-f]{64}$');

-- Connects a tracker (the ID is for the owner's reference) and returns the key to set on it; again
-- makes a new key, which stops the old one. A null ID disconnects it.
create function public.set_truck_tracker(p_truck uuid, p_device text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_truck public.trucks;
  v_device text := nullif(upper(regexp_replace(coalesce(p_device, ''), '[^0-9A-Za-z]', '', 'g')), '');
  v_key text;
begin
  select * into v_truck from public.trucks where id = p_truck for update;
  if v_truck.id is null or not public.can_in_org(v_truck.org_id, 'manage_trucks') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_device is null then
    update public.trucks set tracker_device_id = null, tracker_key_hash = null where id = p_truck;
    return null;
  end if;
  if char_length(v_device) < 6 or char_length(v_device) > 32 then
    raise exception 'a tracker ID is 6 to 32 letters and numbers' using errcode = '22023';
  end if;
  v_key := encode(extensions.gen_random_bytes(18), 'hex');
  update public.trucks set tracker_device_id = v_device, tracker_key_hash = encode(extensions.digest(v_key, 'sha256'), 'hex') where id = p_truck;
  return v_key;
end;
$$;

-- Server only: a tracker sent a position with its key. Wrong keys are ignored (false). A position from
-- the future counts as now; an older one than the last never moves the truck back.
create function public.tracker_ping(p_key text, p_lat float8, p_lng float8, p_at timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_truck uuid;
  v_at timestamptz := least(coalesce(p_at, now()), now());
begin
  if p_key is null or p_key !~ '^[0-9a-f]{36}$' or p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    return false;
  end if;
  update public.trucks set last_known_location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, last_known_at = v_at
  where tracker_key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
    -- At most one position every 10 seconds per truck, so a flood of pings writes nothing (review).
    and (last_known_at is null or last_known_at <= v_at - interval '10 seconds')
  returning id into v_truck;
  -- A truck on a trip carries its trip's position too (Phase 4 adds the full ping history and checks).
  if v_truck is not null then
    update public.trips set last_location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography, last_ping_at = now()
    where truck_id = v_truck and status in ('to_pickup', 'at_pickup', 'loading', 'loaded', 'in_transit', 'arrived');
  end if;
  return v_truck is not null;
end;
$$;

-- T-18 Test connection: the last signal, with its place as numbers.
create function public.truck_signal(p_truck uuid) returns table (at timestamptz, lat float8, lng float8)
language sql stable security definer set search_path = '' as $$
  select t.last_known_at, extensions.st_y(t.last_known_location::extensions.geometry), extensions.st_x(t.last_known_location::extensions.geometry)
  from public.trucks t where t.id = p_truck and public.can_in_org(t.org_id, 'manage_trucks');
$$;

-- ---------------------------------------------------------------------------------------------------
-- Field tasks: verification staff send a field agent to inspect a truck; the agent records the
-- checklist, photos and a pass or a problem. Verification then decides the truck as before.
-- ---------------------------------------------------------------------------------------------------
create table public.field_tasks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('truck_inspection', 'owner_visit', 'park_survey')),
  subject_id uuid not null,
  assigned_to uuid not null references public.profiles (id),
  created_by uuid references public.profiles (id) on delete set null,
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  result jsonb,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index field_tasks_assignee on public.field_tasks (assigned_to, status, due_at);
create trigger field_tasks_audit after insert or update or delete on public.field_tasks for each row execute function private.audit_row('id');
alter table public.field_tasks enable row level security;
create policy "field tasks: assignee reads" on public.field_tasks for select to authenticated using (assigned_to = (select auth.uid()) and (select public.is_staff_in(array['field_agent']::public.staff_role[])));
create policy "field tasks: verification and admins read" on public.field_tasks for select to authenticated
  using ((select public.is_staff_in(array['verification', 'operations', 'super_admin']::public.staff_role[])));
revoke all on public.field_tasks from anon, authenticated;
grant select on public.field_tasks to authenticated;
grant select, insert, update, delete on public.field_tasks to service_role;

create function private.staff_aal2() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
revoke all on function private.staff_aal2() from public;

create function public.create_inspection(p_truck uuid, p_agent uuid, p_due timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if not public.is_staff_in(array['verification', 'super_admin']::public.staff_role[]) or not private.staff_aal2() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.trucks where id = p_truck) then
    raise exception 'unknown truck' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.staff_members where user_id = p_agent and role = 'field_agent' and active) then
    raise exception 'choose a field agent' using errcode = '22023';
  end if;
  insert into public.field_tasks (kind, subject_id, assigned_to, created_by, due_at) values ('truck_inspection', p_truck, p_agent, v_user, coalesce(p_due, now() + interval '2 days'))
  returning id into v_id;
  return v_id;
end;
$$;

-- X-30 Inspect a truck: the checklist, photos, and a pass or a problem with its reason.
create function public.complete_inspection(p_task uuid, p_checks jsonb, p_photos text[], p_pass boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_task public.field_tasks;
begin
  select * into v_task from public.field_tasks where id = p_task for update;
  if v_task.id is null or v_task.assigned_to <> v_user or not private.staff_aal2() or public.my_staff_role() is distinct from 'field_agent' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_task.status <> 'open' then
    raise exception 'this task is closed' using errcode = '22023';
  end if;
  if not coalesce(p_pass, false) and char_length(coalesce(btrim(p_note), '')) < 3 then
    raise exception 'say what the problem is' using errcode = '22023';
  end if;
  update public.field_tasks set status = 'done', done_at = now(), photos = coalesce(p_photos, '{}'),
    result = jsonb_build_object('checks', coalesce(p_checks, '{}'::jsonb), 'pass', coalesce(p_pass, false), 'note', nullif(btrim(p_note), ''))
  where id = p_task;
  -- A problem holds the truck for verification with the agent's note; a pass leaves the decision to them.
  if not coalesce(p_pass, false) then
    update public.trucks set review_note = left('Field inspection: ' || btrim(p_note), 300) where id = v_task.subject_id;
  end if;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.set_truck_tracker(uuid, text)', 'public.truck_signal(uuid)', 'public.create_inspection(uuid, uuid, timestamptz)', 'public.complete_inspection(uuid, jsonb, text[], boolean, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  execute 'revoke all on function public.tracker_ping(text, float8, float8, timestamptz) from public, anon, authenticated';
  execute 'grant execute on function public.tracker_ping(text, float8, float8, timestamptz) to service_role';
end;
$$;
