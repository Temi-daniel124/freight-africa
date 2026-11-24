-- Phase 2 slice 4: trucks and papers (DATA-MODEL.md §4; ux-owner.md T-08 to T-10, T-14a; SYSTEM-LOGIC
-- document expiry). Owners and managers add trucks (ROLES: manage_trucks); verification staff approve
-- trucks and papers. A truck is usable only when it is approved and its required papers are approved and
-- in date; a required paper that expires pauses the truck. Paper photos sit in a private bucket.

create type public.truck_status as enum ('draft', 'pending_review', 'active', 'paused', 'suspended', 'retired');
create type public.availability as enum ('available', 'on_trip', 'unavailable');
create type public.doc_status as enum ('pending', 'approved', 'rejected', 'expired');

create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Normalised: uppercase letters and digits only (LSR123XY).
  plate_number text not null unique check (plate_number ~ '^[A-Z0-9]{5,10}$'),
  truck_type_id uuid not null references public.truck_types (id),
  capacity_kg int not null check (capacity_kg > 0),
  make text check (make is null or char_length(make) <= 40),
  model text check (model is null or char_length(model) <= 40),
  year int check (year is null or year between 1970 and 2100),
  photo_paths text[] not null default '{}',
  status public.truck_status not null default 'pending_review',
  availability public.availability not null default 'available',
  unavailable_until date,
  tracker_device_id text check (tracker_device_id is null or char_length(tracker_device_id) <= 64),
  last_known_location extensions.geography(Point, 4326),
  last_known_at timestamptz,
  corridor_ids uuid[] not null default '{}',
  default_driver_id uuid references public.profiles (id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trucks_org on public.trucks (org_id);
create index trucks_queue on public.trucks (created_at) where status = 'pending_review';
create trigger trucks_touch before update on public.trucks for each row execute function private.touch_updated_at();
create trigger trucks_audit after insert or update or delete on public.trucks for each row execute function private.audit_row('id');

create table public.truck_goods_exclusions (
  truck_id uuid not null references public.trucks (id) on delete cascade,
  goods_category_id uuid not null references public.goods_categories (id) on delete cascade,
  primary key (truck_id, goods_category_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  doc_type_id uuid not null references public.document_types (id),
  subject_kind text not null check (subject_kind in ('truck', 'driver', 'org', 'load')),
  subject_id uuid not null,
  -- The business the paper belongs to, for access (every subject so far belongs to one).
  org_id uuid not null references public.organizations (id) on delete cascade,
  file_path text not null check (char_length(file_path) <= 300),
  ocr jsonb,
  expires_on date,
  status public.doc_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  -- Which reminders went out (30, 7, 1 days before), so each is sent once.
  reminded_days int[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_subject on public.documents (subject_kind, subject_id, created_at desc);
create index documents_queue on public.documents (created_at) where status = 'pending';
create index documents_expiry on public.documents (expires_on) where status = 'approved';
create trigger documents_touch before update on public.documents for each row execute function private.touch_updated_at();
create trigger documents_audit after insert or update or delete on public.documents for each row execute function private.audit_row('id');

-- ---------------------------------------------------------------------------------------------------
-- Access: the business's owners and managers (and its drivers for their own licence, next slice);
-- staff read everything. Writes only through the functions below.
-- ---------------------------------------------------------------------------------------------------

alter table public.trucks enable row level security;
alter table public.truck_goods_exclusions enable row level security;
alter table public.documents enable row level security;

create policy "trucks: business reads" on public.trucks for select to authenticated using ((select public.can_in_org(org_id, 'view_business')));
create policy "trucks: staff read" on public.trucks for select to authenticated using ((select public.is_staff()));
create policy "truck_goods_exclusions: business reads" on public.truck_goods_exclusions for select to authenticated
  using (exists (select 1 from public.trucks t where t.id = truck_id and public.can_in_org(t.org_id, 'view_business')));
create policy "truck_goods_exclusions: staff read" on public.truck_goods_exclusions for select to authenticated using ((select public.is_staff()));
create policy "documents: business reads" on public.documents for select to authenticated using ((select public.can_in_org(org_id, 'manage_trucks')));
create policy "documents: staff read" on public.documents for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'verification', 'operations', 'support']::public.staff_role[])));

do $$
declare
  t text;
begin
  foreach t in array array['trucks', 'truck_goods_exclusions', 'documents'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end;
$$;
-- The truck's live position is for trips (Phase 4); the business sees it there, not here.
revoke select on public.trucks from authenticated;
grant select (id, org_id, plate_number, truck_type_id, capacity_kg, make, model, year, photo_paths, status, availability, unavailable_until,
  tracker_device_id, corridor_ids, default_driver_id, review_note, created_at, updated_at) on public.trucks to authenticated;

-- Photos of trucks and papers: <org id>/<file>. Owners and managers add to their business's folder;
-- they and staff read. Nothing is changed or deleted (a new paper is a new photo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fleet', 'fleet', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function private.folder_org(p_name text) returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p_name, '/', 1)::uuid end;
$$;

create policy "fleet photos: business uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'fleet' and (select public.can_in_org(private.folder_org(name), 'manage_trucks')));
create policy "fleet photos: business reads" on storage.objects for select to authenticated
  using (bucket_id = 'fleet' and (select public.can_in_org(private.folder_org(name), 'view_business')));
create policy "fleet photos: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'fleet' and (select public.is_staff()));

-- ---------------------------------------------------------------------------------------------------
-- Adding (T-09). Photos must already be in the business's folder.
-- ---------------------------------------------------------------------------------------------------

create function private.own_fleet_photo(p_org uuid, p_path text) returns boolean language sql stable security definer set search_path = '' as $$
  select p_path is not null and private.folder_org(p_path) = p_org and p_path not like '%..%'
    and exists (select 1 from storage.objects where bucket_id = 'fleet' and name = p_path);
$$;
revoke all on function private.own_fleet_photo(uuid, text) from public;

create function public.add_truck(p_org uuid, p_plate text, p_truck_type uuid, p_capacity_kg int, p_photos text[], p_corridors uuid[], p_excluded_goods uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_plate text := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_type public.truck_types;
  v_id uuid;
  v_photo text;
begin
  if not public.can_in_org(p_org, 'manage_trucks') or not exists (select 1 from public.organizations where id = p_org and kind = 'transporter' and status = 'active') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_plate !~ '^[A-Z0-9]{5,10}$' then
    raise exception 'check the plate number' using errcode = '22023';
  end if;
  select * into v_type from public.truck_types where id = p_truck_type and active;
  if v_type.id is null or p_capacity_kg is null or p_capacity_kg < v_type.capacity_kg_min or p_capacity_kg > v_type.capacity_kg_max then
    raise exception 'that capacity doesn''t fit this truck type' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_photos), 0) = 0 then
    raise exception 'a photo of the back with the plate is needed' using errcode = '22023';
  end if;
  foreach v_photo in array p_photos loop
    if not private.own_fleet_photo(p_org, v_photo) then
      raise exception 'that photo is not yours' using errcode = '42501';
    end if;
  end loop;
  if coalesce(cardinality(p_corridors), 0) = 0 or exists (select 1 from unnest(p_corridors) c where not exists (select 1 from public.corridors where id = c and active)) then
    raise exception 'choose at least one route' using errcode = '22023';
  end if;
  insert into public.trucks (org_id, plate_number, truck_type_id, capacity_kg, photo_paths, corridor_ids)
  values (p_org, v_plate, p_truck_type, p_capacity_kg, p_photos, p_corridors)
  returning id into v_id;
  insert into public.truck_goods_exclusions (truck_id, goods_category_id)
  select v_id, g from unnest(coalesce(p_excluded_goods, '{}')) g where exists (select 1 from public.goods_categories where id = g)
  on conflict do nothing;
  return v_id;
exception
  when unique_violation then
    raise exception 'a truck with this plate is already on Freight Africa' using errcode = '23505';
end;
$$;

-- A paper for a truck (the driver's licence comes with the drivers slice). A new paper of the same type
-- replaces the old one when it is approved.
create function public.add_truck_document(p_truck uuid, p_doc_type text, p_photo text, p_expires_on date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_truck public.trucks;
  v_type public.document_types;
  v_id uuid;
begin
  perform private.require_user();
  select * into v_truck from public.trucks where id = p_truck;
  if v_truck.id is null or not public.can_in_org(v_truck.org_id, 'manage_trucks') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_type from public.document_types where code = p_doc_type and applies_to in ('truck', 'org');
  if v_type.id is null then
    raise exception 'unknown paper' using errcode = '22023';
  end if;
  if v_type.has_expiry and (p_expires_on is null or p_expires_on <= current_date) then
    raise exception 'enter an expiry date in the future' using errcode = '22023';
  end if;
  if not private.own_fleet_photo(v_truck.org_id, p_photo) then
    raise exception 'that photo is not yours' using errcode = '42501';
  end if;
  insert into public.documents (doc_type_id, subject_kind, subject_id, org_id, file_path, expires_on)
  values (v_type.id, case when v_type.applies_to = 'org' then 'org' else 'truck' end, case when v_type.applies_to = 'org' then v_truck.org_id else p_truck end, v_truck.org_id, p_photo, p_expires_on)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Staff decisions. A truck becomes active only when it is approved and every required truck paper is
-- approved and in date; until then an approved truck waits as pending_review.
-- ---------------------------------------------------------------------------------------------------

create function private.truck_papers_ok(p_truck uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.document_types dt
    where dt.applies_to = 'truck' and dt.required
      and not exists (
        select 1 from public.documents d
        where d.subject_kind = 'truck' and d.subject_id = p_truck and d.doc_type_id = dt.id and d.status = 'approved'
          and (d.expires_on is null or d.expires_on >= current_date)
      )
  );
$$;
revoke all on function private.truck_papers_ok(uuid) from public;

create function private.require_verifier() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not public.is_staff_in(array['super_admin', 'verification']::public.staff_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return v_user;
end;
$$;
revoke all on function private.require_verifier() from public;

create function public.decide_document(p_document uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_verifier();
  v_doc public.documents;
  v_note text := nullif(btrim(p_note), '');
  v_owner uuid;
begin
  if not p_approve and v_note is null then
    raise exception 'say why, so they can fix it' using errcode = '22023';
  end if;
  select * into v_doc from public.documents where id = p_document for update;
  if v_doc.id is null or v_doc.status <> 'pending' then
    raise exception 'this paper is not waiting' using errcode = 'P0002';
  end if;
  update public.documents set status = case when p_approve then 'approved'::public.doc_status else 'rejected'::public.doc_status end,
    reviewed_by = v_user, review_note = v_note where id = p_document;
  if p_approve then
    -- The newest approved paper of a type replaces older ones.
    update public.documents set status = 'expired'
    where subject_kind = v_doc.subject_kind and subject_id = v_doc.subject_id and doc_type_id = v_doc.doc_type_id and id <> p_document and status = 'approved';
    if v_doc.subject_kind = 'truck' then
      update public.trucks set status = 'active'
      where id = v_doc.subject_id and status in ('pending_review', 'paused') and reviewed_by is not null and private.truck_papers_ok(id);
    end if;
  else
    select m.user_id into v_owner from public.organization_members m where m.org_id = v_doc.org_id and m.transporter_role = 'owner' and m.status = 'active' limit 1;
    perform private.notify('document.rejected', 'document.rejected', array['in_app', 'email']::public.notify_channel[],
      jsonb_build_object('paper', (select name from public.document_types where id = v_doc.doc_type_id), 'reason', v_note), v_owner,
      p_dedupe_key => 'document:' || p_document::text);
  end if;
end;
$$;

create function public.decide_truck(p_truck uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_verifier();
  v_truck public.trucks;
  v_note text := nullif(btrim(p_note), '');
  v_owner uuid;
begin
  if not p_approve and v_note is null then
    raise exception 'say why, so they can fix it' using errcode = '22023';
  end if;
  select * into v_truck from public.trucks where id = p_truck for update;
  if v_truck.id is null or v_truck.status <> 'pending_review' then
    raise exception 'this truck is not waiting' using errcode = 'P0002';
  end if;
  update public.trucks
  set reviewed_by = v_user, review_note = v_note,
      status = case when not p_approve then 'draft'::public.truck_status
                    when private.truck_papers_ok(p_truck) then 'active'::public.truck_status
                    else 'pending_review'::public.truck_status end
  where id = p_truck;
  select m.user_id into v_owner from public.organization_members m where m.org_id = v_truck.org_id and m.transporter_role = 'owner' and m.status = 'active' limit 1;
  perform private.notify(case when p_approve then 'truck.approved' else 'truck.rejected' end, case when p_approve then 'truck.approved' else 'truck.rejected' end,
    array['in_app', 'email']::public.notify_channel[], jsonb_build_object('plate', v_truck.plate_number, 'reason', coalesce(v_note, '')), v_owner,
    p_dedupe_key => 'truck:' || p_truck::text || ':' || p_approve::text);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Every morning: reminders 30, 7 and 1 days before a paper expires; expired papers are marked, and a
-- truck whose required paper has expired is paused until a new one is approved.
-- ---------------------------------------------------------------------------------------------------

create function private.daily_document_checks() returns int language plpgsql security definer set search_path = '' as $$
declare
  v_doc record;
  v_days int;
  v_count int := 0;
begin
  for v_doc in
    select d.id, d.org_id, d.expires_on, d.reminded_days, dt.name as paper, coalesce(t.plate_number, '') as plate
    from public.documents d
    join public.document_types dt on dt.id = d.doc_type_id
    left join public.trucks t on d.subject_kind = 'truck' and t.id = d.subject_id
    where d.status = 'approved' and d.expires_on is not null and d.expires_on between current_date and current_date + 30
  loop
    v_days := v_doc.expires_on - current_date;
    v_days := case when v_days <= 1 then 1 when v_days <= 7 then 7 else 30 end;
    if not (v_days = any (v_doc.reminded_days)) then
      perform private.notify('document.expiring', 'document.expiring', array['in_app', 'email']::public.notify_channel[],
        jsonb_build_object('paper', v_doc.paper, 'plate', v_doc.plate, 'date', to_char(v_doc.expires_on, 'DD Mon YYYY')),
        (select m.user_id from public.organization_members m where m.org_id = v_doc.org_id and m.transporter_role = 'owner' and m.status = 'active' limit 1),
        p_dedupe_key => 'expiring:' || v_doc.id::text || ':' || v_days::text);
      update public.documents set reminded_days = reminded_days || v_days where id = v_doc.id;
      v_count := v_count + 1;
    end if;
  end loop;
  update public.documents set status = 'expired' where status = 'approved' and expires_on < current_date;
  update public.trucks t set status = 'paused'
  where t.status = 'active' and not private.truck_papers_ok(t.id);
  return v_count;
end;
$$;
revoke all on function private.daily_document_checks() from public;
-- 06:00 UTC is 07:00 in Lagos.
select cron.schedule('documents-daily', '0 6 * * *', $$select private.daily_document_checks()$$);

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.add_truck(uuid, text, uuid, int, text[], uuid[], uuid[])',
    'public.add_truck_document(uuid, text, text, date)',
    'public.decide_document(uuid, boolean, text)',
    'public.decide_truck(uuid, boolean, text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

insert into public.message_templates (code, channel, subject, body, variables) values
  ('truck.approved', 'email', 'Your truck {{plate}} is checked', 'Your truck {{plate}} has been checked. Once its papers are checked too, you can take loads with it.', '{plate}'),
  ('truck.approved', 'in_app', null, 'Truck {{plate}} is checked.', '{plate}'),
  ('truck.rejected', 'email', 'Your truck {{plate}} needs a change', 'We couldn''t approve truck {{plate}}: {{reason}} Open the app to fix it.', '{plate,reason}'),
  ('truck.rejected', 'in_app', null, 'Truck {{plate}} needs a change: {{reason}}', '{plate,reason}'),
  ('document.rejected', 'email', 'Please send a new photo of your {{paper}}', 'We couldn''t accept your {{paper}}: {{reason}} Open the app to send a new photo.', '{paper,reason}'),
  ('document.rejected', 'in_app', null, 'Send a new {{paper}}: {{reason}}', '{paper,reason}'),
  ('document.expiring', 'email', 'Your {{paper}} expires on {{date}}', 'The {{paper}} for {{plate}} expires on {{date}}. Send the new one before then so the truck keeps working.', '{paper,plate,date}'),
  ('document.expiring', 'in_app', null, '{{paper}} for {{plate}} expires on {{date}}.', '{paper,plate,date}');
