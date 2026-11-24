-- D043: people see three account types (Sender, Truck owner, Driver). joining_as records only the
-- two sign-up choices; driving your own truck is the membership's is_driver switch, not a role.

update public.profiles set joining_as = 'owner' where joining_as = 'owner_driver';
update public.profiles set joining_as = null where joining_as = 'agent';

alter table public.profiles drop constraint if exists profiles_joining_as_check;
alter table public.profiles add constraint profiles_joining_as_check
  check (joining_as is null or joining_as in ('shipper', 'owner'));

-- T-ON-02 keeps its shape; whether they drive now lives only on the membership.
create or replace function public.save_transporter_profile(p_org uuid, p_home_city uuid, p_corridors uuid[], p_drives boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not exists (
    select 1 from public.organization_members m join public.organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = v_user and m.transporter_role = 'owner' and m.status = 'active' and o.kind = 'transporter'
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_home_city is not null and not exists (select 1 from public.cities where id = p_home_city) then
    raise exception 'unknown city' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_corridors), 0) = 0 or exists (select 1 from unnest(p_corridors) c where not exists (select 1 from public.corridors where id = c and active)) then
    raise exception 'choose at least one route' using errcode = '22023';
  end if;
  update public.organizations set home_city_id = p_home_city, corridor_ids = p_corridors where id = p_org;
  update public.organization_members set is_driver = coalesce(p_drives, false) where org_id = p_org and user_id = v_user;
  update public.profiles set joining_as = 'owner' where id = v_user;
end;
$$;

-- Settings: "I drive my own truck". Owners and admins of a truck business switch it for themselves
-- only; it adds or removes the Drive tab (and their driver record, through the existing triggers).
create function public.set_i_drive(p_org uuid, p_drives boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not exists (
    select 1 from public.organization_members m join public.organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = v_user and m.transporter_role in ('owner', 'manager') and m.status = 'active' and o.kind = 'transporter'
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.organization_members set is_driver = coalesce(p_drives, false) where org_id = p_org and user_id = v_user;
end;
$$;
revoke all on function public.set_i_drive(uuid, boolean) from public;
grant execute on function public.set_i_drive(uuid, boolean) to authenticated;
