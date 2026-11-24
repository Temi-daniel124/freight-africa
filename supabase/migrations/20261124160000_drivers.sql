-- Phase 2 slice 5: drivers (DATA-MODEL.md §2 drivers; ux-owner.md T-11 to T-13; ux-driver.md D-ON-01 to
-- D-ON-05) and the app-lock PIN (D042). Drivers join through the slice 4 driver invite; this adds their
-- driver record, their own licence, and when they may drive: identity approved and licence approved and
-- in date.

create table public.drivers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  licence_number text check (licence_number is null or licence_number ~ '^[A-Z0-9-]{5,20}$'),
  licence_expires_on date,
  default_truck_id uuid references public.trucks (id) on delete set null,
  -- pending until identity and licence are approved; suspended only by staff.
  status public.account_status not null default 'pending',
  -- The owner's "Pause driver" (T-13): no new trips. Separate from a staff suspension, which only staff lift.
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drivers_org on public.drivers (org_id);
create trigger drivers_touch before update on public.drivers for each row execute function private.touch_updated_at();
create trigger drivers_audit after insert or update or delete on public.drivers for each row execute function private.audit_row('user_id');

alter table public.drivers enable row level security;
create policy "drivers: own" on public.drivers for select to authenticated using (user_id = (select auth.uid()));
create policy "drivers: business reads" on public.drivers for select to authenticated using ((select public.can_in_org(org_id, 'manage_drivers')));
create policy "drivers: staff read" on public.drivers for select to authenticated using ((select public.is_staff()));
revoke all on public.drivers from anon, authenticated;
grant select on public.drivers to authenticated;
grant select, insert, update, delete on public.drivers to service_role;

-- Every driver and owner-driver has a driver record, from the moment they join or say they drive.
create function private.ensure_driver() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_driver and new.status = 'active' then
    insert into public.drivers (user_id, org_id) values (new.user_id, new.org_id)
    on conflict (user_id) do update
      set org_id = excluded.org_id,
          paused = case when public.drivers.org_id <> excluded.org_id then false else public.drivers.paused end,
          status = case when public.drivers.org_id <> excluded.org_id and public.drivers.status <> 'suspended' then 'pending'::public.account_status else public.drivers.status end;
    perform private.refresh_driver(new.user_id);
  end if;
  return null;
end;
$$;
revoke all on function private.ensure_driver() from public;
create trigger organization_members_driver after insert or update of is_driver, status on public.organization_members
  for each row execute function private.ensure_driver();

-- Someone who leaves the business, stops driving there or is deactivated stops being its driver (review).
create function private.drop_driver() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_driver and (tg_op = 'DELETE' or not new.is_driver or new.status <> 'active') then
    -- A staff suspension stays with the person (review): their record is kept, so joining another
    -- business can't wipe it (ensure_driver keeps 'suspended' when it moves them).
    delete from public.drivers where user_id = old.user_id and org_id = old.org_id and status <> 'suspended';
  end if;
  return null;
end;
$$;
revoke all on function private.drop_driver() from public;
create trigger organization_members_drop_driver after delete or update of is_driver, status on public.organization_members
  for each row execute function private.drop_driver();


-- May this person drive? Identity approved, and an approved licence in date. Suspended stays suspended.
create function private.refresh_driver(p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_licence public.documents;
begin
  select d.* into v_licence from public.documents d join public.document_types dt on dt.id = d.doc_type_id
  where d.subject_kind = 'driver' and d.subject_id = p_user and dt.code = 'drivers_licence' and d.status = 'approved'
    and d.org_id = (select org_id from public.drivers where user_id = p_user)
  order by d.created_at desc limit 1;
  update public.drivers dr
  set licence_expires_on = v_licence.expires_on,
      licence_number = coalesce(v_licence.ocr ->> 'licence_number', dr.licence_number),
      status = case
        when dr.status = 'suspended' then 'suspended'::public.account_status
        when (select kyc_status from public.profiles where id = p_user) = 'approved'
             and v_licence.id is not null and (v_licence.expires_on is null or v_licence.expires_on >= current_date)
          then 'active'::public.account_status
        else 'pending'::public.account_status
      end
  where dr.user_id = p_user;
end;
$$;
revoke all on function private.refresh_driver(uuid) from public;

-- Drivers who joined before this migration: the business they joined first, then their status.
insert into public.drivers (user_id, org_id)
select distinct on (user_id) user_id, org_id from public.organization_members
where is_driver and status = 'active'
order by user_id, created_at
on conflict (user_id) do nothing;
select private.refresh_driver(user_id) from public.drivers;

create function private.refresh_driver_from_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_driver(new.id);
  return null;
end;
$$;
create trigger profiles_driver_status after update of kyc_status on public.profiles for each row execute function private.refresh_driver_from_profile();

create function private.refresh_driver_from_document() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.subject_kind = 'driver' then
    perform private.refresh_driver(new.subject_id);
  end if;
  return null;
end;
$$;
create trigger documents_driver_status after insert or update of status on public.documents for each row execute function private.refresh_driver_from_document();
revoke all on function private.refresh_driver_from_profile() from public;
revoke all on function private.refresh_driver_from_document() from public;

-- ---------------------------------------------------------------------------------------------------
-- The driver's licence (D-ON-03): the driver adds it themselves, into <org>/drivers/<their id>/.
-- ---------------------------------------------------------------------------------------------------

create policy "fleet photos: driver uploads own licence" on storage.objects for insert to authenticated
  with check (bucket_id = 'fleet' and split_part(name, '/', 2) = 'drivers' and split_part(name, '/', 3) = (select auth.uid())::text
    and (select public.can_in_org(private.folder_org(name), 'own_licence')));
create policy "fleet photos: driver reads own" on storage.objects for select to authenticated
  using (bucket_id = 'fleet' and split_part(name, '/', 2) = 'drivers' and split_part(name, '/', 3) = (select auth.uid())::text);
create policy "documents: driver reads own" on public.documents for select to authenticated
  using (subject_kind = 'driver' and subject_id = (select auth.uid()));

create function public.add_driver_licence(p_photo text, p_expires_on date, p_number text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_driver public.drivers;
  v_id uuid;
  v_number text := nullif(upper(regexp_replace(coalesce(p_number, ''), '\s', '', 'g')), '');
begin
  select * into v_driver from public.drivers where user_id = v_user;
  if v_driver.user_id is null or not public.can_in_org(v_driver.org_id, 'own_licence') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_expires_on is null or p_expires_on <= current_date then
    raise exception 'enter an expiry date in the future' using errcode = '22023';
  end if;
  if v_number is not null and v_number !~ '^[A-Z0-9-]{5,20}$' then
    raise exception 'check the licence number' using errcode = '22023';
  end if;
  if p_photo is null or private.folder_org(p_photo) <> v_driver.org_id or split_part(p_photo, '/', 2) <> 'drivers' or split_part(p_photo, '/', 3) <> v_user::text
     or p_photo like '%..%' or not exists (select 1 from storage.objects where bucket_id = 'fleet' and name = p_photo) then
    raise exception 'that photo is not yours' using errcode = '42501';
  end if;
  insert into public.documents (doc_type_id, subject_kind, subject_id, org_id, file_path, expires_on, ocr)
  values ((select id from public.document_types where code = 'drivers_licence'), 'driver', v_user, v_driver.org_id, p_photo, p_expires_on,
    case when v_number is not null then jsonb_build_object('licence_number', v_number) end)
  returning id into v_id;
  return v_id;
end;
$$;

-- T-13: the owner or a manager pauses a driver (no new trips) or lets them drive again.
create function public.set_driver_paused(p_driver uuid, p_paused boolean) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_driver public.drivers;
begin
  perform private.require_user();
  select * into v_driver from public.drivers where user_id = p_driver for update;
  if v_driver.user_id is null or not public.can_in_org(v_driver.org_id, 'manage_drivers') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.drivers set paused = p_paused where user_id = p_driver;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- The app-lock PIN (D042). Six digits that open the app on the driver's phone after a code sign-in;
-- never a way to sign in. Stored as a bcrypt hash; five wrong tries lock it until the person signs in
-- with a code again and sets a new one. Changing an existing PIN needs a sign-in in the last 15 minutes.
-- ---------------------------------------------------------------------------------------------------

create table private.app_pins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text not null,
  failed int not null default 0,
  updated_at timestamptz not null default now()
);

create function private.signed_in_within(p_seconds int) returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce((select auth.jwt() -> 'amr'), '[]'::jsonb)) a
    where (a ->> 'timestamp') ~ '^[0-9]{1,12}$' and (a ->> 'timestamp')::bigint >= extract(epoch from now())::bigint - p_seconds
  );
$$;
revoke all on function private.signed_in_within(int) from public;

create function public.has_app_pin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.app_pins where user_id = (select auth.uid()));
$$;

create function public.set_app_pin(p_pin text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if coalesce(p_pin, '') !~ '^[0-9]{6}$' or p_pin ~ '^(.)\1{5}$' or p_pin in ('123456', '654321', '012345', '123123', '121212') then
    raise exception 'choose a PIN that is harder to guess' using errcode = '22023';
  end if;
  if exists (select 1 from private.app_pins where user_id = v_user) and not private.signed_in_within(900) then
    raise exception 'sign in again to change your PIN' using errcode = '28000';
  end if;
  insert into private.app_pins (user_id, pin_hash, failed, updated_at)
  values (v_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), 0, now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, updated_at = now();
end;
$$;

-- 'ok', 'wrong', 'locked' or 'none'. Each wrong try counts; the fifth locks.
create function public.check_app_pin(p_pin text) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_row private.app_pins;
begin
  select * into v_row from private.app_pins where user_id = v_user for update;
  if v_row.user_id is null then
    return 'none';
  end if;
  if v_row.failed >= 5 then
    return 'locked';
  end if;
  if coalesce(p_pin, '') ~ '^[0-9]{6}$' and extensions.crypt(p_pin, v_row.pin_hash) = v_row.pin_hash then
    update private.app_pins set failed = 0 where user_id = v_user;
    return 'ok';
  end if;
  update private.app_pins set failed = failed + 1 where user_id = v_user;
  return case when v_row.failed + 1 >= 5 then 'locked' else 'wrong' end;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.add_driver_licence(text, date, text)',
    'public.set_driver_paused(uuid, boolean)',
    'public.has_app_pin()',
    'public.set_app_pin(text)',
    'public.check_app_pin(text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
