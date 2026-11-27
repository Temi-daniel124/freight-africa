-- Combined brief slice 5e: saved places and receivers (DATA-MODEL §5, sender P16d / D11) and the business
-- profile's receipt details (P16g). Everyone in the business can read; bookers and up change places and
-- receivers; owners and admins change the business profile (ROLES-AND-PERMISSIONS §2). Writes go through
-- functions only.

create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  city_id uuid not null references public.cities (id),
  address_text text not null check (char_length(btrim(address_text)) between 3 and 200),
  landmark text check (landmark is null or char_length(landmark) <= 120),
  default_contact_name text check (default_contact_name is null or char_length(default_contact_name) <= 80),
  default_contact_phone text check (default_contact_phone is null or default_contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  use_count int not null default 0 check (use_count >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_places_org on public.saved_places (org_id, use_count desc);

create table public.saved_receivers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  use_count int not null default 0 check (use_count >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, phone)
);
create index saved_receivers_org on public.saved_receivers (org_id, use_count desc);

create trigger saved_places_touch before update on public.saved_places for each row execute function private.touch_updated_at();
create trigger saved_receivers_touch before update on public.saved_receivers for each row execute function private.touch_updated_at();

alter table public.saved_places enable row level security;
alter table public.saved_receivers enable row level security;
create policy "saved places: the business" on public.saved_places for select to authenticated using ((select public.can_in_org(org_id, 'view_business')));
create policy "saved receivers: the business" on public.saved_receivers for select to authenticated using ((select public.can_in_org(org_id, 'view_business')));
revoke all on public.saved_places, public.saved_receivers from anon, authenticated;
grant select on public.saved_places, public.saved_receivers to authenticated;
grant select, insert, update, delete on public.saved_places, public.saved_receivers to service_role;

-- Add or change a place (p_id null adds one).
create function public.save_place(p_org uuid, p_id uuid, p_label text, p_city uuid, p_address text, p_landmark text default null,
  p_contact_name text default null, p_contact_phone text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if not public.can_in_org(p_org, 'book') or not exists (select 1 from public.organizations where id = p_org and kind = 'shipper') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cities where id = p_city) then
    raise exception 'unknown city' using errcode = '22023';
  end if;
  if p_id is null then
    if (select count(*) from public.saved_places where org_id = p_org) >= 100 then
      raise exception 'up to 100 saved places' using errcode = '22023';
    end if;
    insert into public.saved_places (org_id, label, city_id, address_text, landmark, default_contact_name, default_contact_phone, created_by)
    values (p_org, btrim(p_label), p_city, btrim(p_address), nullif(btrim(p_landmark), ''), nullif(btrim(p_contact_name), ''), nullif(btrim(p_contact_phone), ''), v_user)
    returning id into v_id;
  else
    update public.saved_places set label = btrim(p_label), city_id = p_city, address_text = btrim(p_address), landmark = nullif(btrim(p_landmark), ''),
      default_contact_name = nullif(btrim(p_contact_name), ''), default_contact_phone = nullif(btrim(p_contact_phone), '')
    where id = p_id and org_id = p_org
    returning id into v_id;
    if v_id is null then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  return v_id;
end;
$$;

create function public.save_receiver(p_org uuid, p_id uuid, p_name text, p_phone text, p_email text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if not public.can_in_org(p_org, 'book') or not exists (select 1 from public.organizations where id = p_org and kind = 'shipper') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_id is null then
    if (select count(*) from public.saved_receivers where org_id = p_org) >= 200 then
      raise exception 'up to 200 saved receivers' using errcode = '22023';
    end if;
    insert into public.saved_receivers (org_id, name, phone, email, created_by)
    values (p_org, btrim(p_name), btrim(p_phone), nullif(lower(btrim(p_email)), ''), v_user)
    on conflict (org_id, phone) do update set name = excluded.name, email = coalesce(excluded.email, public.saved_receivers.email)
    returning id into v_id;
  else
    update public.saved_receivers set name = btrim(p_name), phone = btrim(p_phone), email = nullif(lower(btrim(p_email)), '')
    where id = p_id and org_id = p_org
    returning id into v_id;
    if v_id is null then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
  return v_id;
end;
$$;

create function public.delete_saved(p_kind text, p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  perform private.require_user();
  if p_kind = 'place' then
    select org_id into v_org from public.saved_places where id = p_id;
  elsif p_kind = 'receiver' then
    select org_id into v_org from public.saved_receivers where id = p_id;
  else
    raise exception 'place or receiver' using errcode = '22023';
  end if;
  if v_org is null or not public.can_in_org(v_org, 'book') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind = 'place' then
    delete from public.saved_places where id = p_id;
  else
    delete from public.saved_receivers where id = p_id;
  end if;
end;
$$;

-- P16g: the receipt details. Owners and admins only (edit_business); the address and email print on receipts.
alter table public.organizations
  add column receipt_address text check (receipt_address is null or char_length(receipt_address) <= 200),
  add column receipt_email text check (receipt_email is null or (char_length(receipt_email) <= 254 and receipt_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
grant select (receipt_address, receipt_email) on public.organizations to authenticated;

create function public.update_business_profile(p_org uuid, p_name text, p_cac_number text, p_receipt_address text, p_receipt_email text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not public.can_in_org(p_org, 'edit_business') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.organizations set name = btrim(p_name), cac_number = nullif(btrim(p_cac_number), ''),
    receipt_address = nullif(btrim(p_receipt_address), ''), receipt_email = nullif(lower(btrim(p_receipt_email)), '')
  where id = p_org;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.save_place(uuid, uuid, text, uuid, text, text, text, text)',
    'public.save_receiver(uuid, uuid, text, text, text)',
    'public.delete_saved(text, uuid)',
    'public.update_business_profile(uuid, text, text, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
