-- Phase 2 slice 1: the catalogue and geography (DATA-MODEL.md §3). Corridors are data, not code (D013).
-- Read by everyone (the public route pages and the booking form need them); changed only by server
-- code (the staff catalogue screens come later). Distances and hours are approximate road figures for
-- display; prices come from lane_prices (Phase 3). PostGIS gives the geography columns DATA-MODEL uses.

create extension if not exists postgis with schema extensions;

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  state text not null check (char_length(state) between 1 and 80),
  location extensions.geography(Point, 4326) not null,
  is_corridor_hub boolean not null default false,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$')
);

create table public.corridors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  city_a_id uuid not null references public.cities (id),
  city_b_id uuid not null references public.cities (id),
  via text[] not null default '{}',
  distance_km int not null check (distance_km > 0),
  typical_hours int not null check (typical_hours > 0),
  active boolean not null default true,
  check (city_a_id <> city_b_id)
);

create table public.truck_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) between 1 and 60),
  picture_path text,
  capacity_kg_default int not null check (capacity_kg_default > 0),
  capacity_kg_min int not null check (capacity_kg_min > 0),
  capacity_kg_max int not null,
  sort_order int not null default 0,
  active boolean not null default true,
  check (capacity_kg_min <= capacity_kg_default and capacity_kg_default <= capacity_kg_max)
);

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  applies_to text not null check (applies_to in ('truck', 'driver', 'org', 'load')),
  required boolean not null default false,
  has_expiry boolean not null default false,
  blocks_when_expired boolean not null default false
);

create table public.goods_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  icon_path text,
  parent_id uuid references public.goods_categories (id),
  is_banned boolean not null default false,
  specialist_only boolean not null default false,
  required_doc_type_ids uuid[] not null default '{}',
  loss_allowance_bps int not null default 0 check (loss_allowance_bps between 0 and 10000),
  needs_seal boolean not null default false,
  handling_note text check (handling_note is null or char_length(handling_note) <= 200),
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.truck_type_goods (
  truck_type_id uuid not null references public.truck_types (id) on delete cascade,
  goods_category_id uuid not null references public.goods_categories (id) on delete cascade,
  primary key (truck_type_id, goods_category_id)
);

do $$
declare
  t text;
begin
  foreach t in array array['cities', 'corridors', 'truck_types', 'document_types', 'goods_categories', 'truck_type_goods'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: everyone reads" on public.%I for select to anon, authenticated using (true)', t, t);
    -- Supabase's default privileges grant everything on new tables; truncate isn't covered by RLS.
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Seed (D013): the hubs of the four corridors and the main stops on them.
-- ---------------------------------------------------------------------------------------------------

insert into public.cities (slug, name, state, location, is_corridor_hub) values
  ('lagos', 'Lagos', 'Lagos', 'SRID=4326;POINT(3.3792 6.5244)', true),
  ('kano', 'Kano', 'Kano', 'SRID=4326;POINT(8.5920 12.0022)', true),
  ('abuja', 'Abuja', 'FCT', 'SRID=4326;POINT(7.3986 9.0765)', true),
  ('onitsha', 'Onitsha', 'Anambra', 'SRID=4326;POINT(6.8029 6.1413)', true),
  ('aba', 'Aba', 'Abia', 'SRID=4326;POINT(7.3667 5.1066)', true),
  ('port-harcourt', 'Port Harcourt', 'Rivers', 'SRID=4326;POINT(7.0498 4.8156)', true),
  ('enugu', 'Enugu', 'Enugu', 'SRID=4326;POINT(7.5464 6.4584)', true),
  ('ibadan', 'Ibadan', 'Oyo', 'SRID=4326;POINT(3.9470 7.3775)', false),
  ('ilorin', 'Ilorin', 'Kwara', 'SRID=4326;POINT(4.5426 8.4966)', false),
  ('kaduna', 'Kaduna', 'Kaduna', 'SRID=4326;POINT(7.4165 10.5105)', false),
  ('lokoja', 'Lokoja', 'Kogi', 'SRID=4326;POINT(6.7333 7.8023)', false),
  ('benin-city', 'Benin City', 'Edo', 'SRID=4326;POINT(5.6037 6.3350)', false);

insert into public.corridors (slug, name, city_a_id, city_b_id, via, distance_km, typical_hours)
select c.slug, c.name, a.id, b.id, c.via, c.km, c.hours
from (values
  ('lagos-kano', 'Lagos ⇄ Kano', 'lagos', 'kano', array['Ibadan', 'Ilorin', 'Jebba', 'Mokwa', 'Kaduna', 'Zaria'], 1000, 24),
  ('lagos-abuja', 'Lagos ⇄ Abuja', 'lagos', 'abuja', array['Ibadan', 'Ilorin', 'Lokoja'], 760, 16),
  ('lagos-onitsha-aba', 'Lagos ⇄ Onitsha/Aba', 'lagos', 'aba', array['Ore', 'Benin City', 'Asaba', 'Onitsha'], 600, 14),
  ('eastern-loop', 'Port Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu', 'port-harcourt', 'enugu', array['Aba', 'Onitsha'], 380, 9)
) as c (slug, name, a, b, via, km, hours)
join public.cities a on a.slug = c.a
join public.cities b on b.slug = c.b;

insert into public.truck_types (code, name, capacity_kg_default, capacity_kg_min, capacity_kg_max, sort_order) values
  ('flatbed_30t', 'Flatbed, 30 tonnes', 30000, 20000, 40000, 1),
  ('covered_20t', 'Covered truck, 20 tonnes', 20000, 10000, 25000, 2),
  ('container_40ft', '40 ft container', 30000, 20000, 32000, 3),
  ('tipper', 'Tipper', 20000, 10000, 30000, 4),
  ('livestock', 'Livestock truck', 15000, 8000, 20000, 5),
  ('tanker', 'Tanker', 33000, 20000, 45000, 6);

insert into public.document_types (code, name, applies_to, required, has_expiry, blocks_when_expired) values
  ('vehicle_licence', 'Vehicle licence', 'truck', true, true, true),
  ('roadworthiness', 'Road-worthiness certificate', 'truck', true, true, true),
  ('insurance_third_party', 'Third-party motor insurance', 'truck', true, true, true),
  ('goods_in_transit', 'Goods-in-transit insurance', 'org', false, true, false),
  ('drivers_licence', 'Driver''s licence', 'driver', true, true, true),
  ('vet_certificate', 'Vet health certificate', 'load', false, true, true),
  ('cac_certificate', 'CAC certificate', 'org', false, false, false);

-- Groups first (parent_id null), then the goods people pick.
insert into public.goods_categories (code, name, sort_order) values
  ('food_farm', 'Food and farm produce', 1),
  ('building', 'Building materials', 2),
  ('general', 'Packed goods', 3),
  ('special', 'Special goods', 4);

insert into public.goods_categories (code, name, parent_id, is_banned, specialist_only, loss_allowance_bps, needs_seal, handling_note, sort_order)
select g.code, g.name, p.id, g.banned, g.specialist, g.loss, g.seal, g.note, g.sort
from (values
  ('grain_bags', 'Bags of grain', 'food_farm', false, false, 0, false, 'Cover with a tarpaulin if it may rain.', 1),
  ('rice_bags', 'Bags of rice', 'food_farm', false, false, 0, false, null, 2),
  ('yams_tubers', 'Yams and tubers', 'food_farm', false, false, 200, false, 'Load loosely so air moves.', 3),
  ('fresh_produce', 'Fresh fruit and vegetables', 'food_farm', false, false, 300, false, 'Drive without long stops.', 4),
  ('livestock', 'Cattle, goats and sheep', 'food_farm', false, false, 100, false, 'Water and rest stops as agreed.', 5),
  ('cement', 'Cement', 'building', false, false, 0, false, 'Keep dry.', 1),
  ('steel_rods', 'Iron rods and steel', 'building', false, false, 0, false, 'Strap down at both ends.', 2),
  ('tiles_sanitary', 'Tiles and sanitary ware', 'building', false, false, 0, false, 'Fragile: stack on pallets.', 3),
  ('sand_gravel', 'Sand and gravel', 'building', false, false, 0, false, null, 4),
  ('cartons', 'Cartons and boxes', 'general', false, false, 0, true, null, 1),
  ('drinks', 'Drinks and beverages', 'general', false, false, 0, true, 'Fragile: crates upright.', 2),
  ('household', 'Furniture and household goods', 'general', false, false, 0, false, null, 3),
  ('machinery', 'Machinery and equipment', 'general', false, false, 0, false, 'Strap down; check weight per axle.', 4),
  ('fuel', 'Fuel and oil', 'special', false, true, 0, true, 'Licensed tanker only.', 1),
  ('chemicals', 'Chemicals', 'special', false, true, 0, true, 'Licensed carrier only.', 2),
  ('weapons_explosives', 'Weapons and explosives', 'special', true, false, 0, false, null, 3)
) as g (code, name, parent, banned, specialist, loss, seal, note, sort)
join public.goods_categories p on p.code = g.parent;

update public.goods_categories set required_doc_type_ids = array[(select id from public.document_types where code = 'vet_certificate')]
where code = 'livestock';

insert into public.truck_type_goods (truck_type_id, goods_category_id)
select t.id, g.id
from (values
  ('flatbed_30t', array['grain_bags', 'rice_bags', 'cement', 'steel_rods', 'tiles_sanitary', 'cartons', 'drinks', 'household', 'machinery']),
  ('covered_20t', array['grain_bags', 'rice_bags', 'yams_tubers', 'fresh_produce', 'cement', 'tiles_sanitary', 'cartons', 'drinks', 'household']),
  ('container_40ft', array['cartons', 'drinks', 'household', 'machinery', 'tiles_sanitary']),
  ('tipper', array['sand_gravel']),
  ('livestock', array['livestock']),
  ('tanker', array['fuel', 'chemicals'])
) as m (truck, goods)
join public.truck_types t on t.code = m.truck
cross join lateral unnest(m.goods) as gc (code)
join public.goods_categories g on g.code = gc.code;
