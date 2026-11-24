-- Review fix: a business sees and pauses only drivers who are its active drivers now. A suspended
-- driver's record is kept after they leave (so the suspension can't be shed), but their former
-- business no longer sees it.

create function public.is_current_driver(p_org uuid, p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  -- Answers only for someone who manages that business's drivers, or about oneself (no membership oracle).
  select (public.can_in_org(p_org, 'manage_drivers') or p_user = (select auth.uid()))
    and exists (select 1 from public.organization_members m where m.org_id = p_org and m.user_id = p_user and m.is_driver and m.status = 'active');
$$;
revoke all on function public.is_current_driver(uuid, uuid) from public;
grant execute on function public.is_current_driver(uuid, uuid) to authenticated;

drop policy "drivers: business reads" on public.drivers;
create policy "drivers: business reads" on public.drivers for select to authenticated
  using ((select public.can_in_org(org_id, 'manage_drivers')) and public.is_current_driver(org_id, user_id));

create or replace function public.set_driver_paused(p_driver uuid, p_paused boolean) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_driver public.drivers;
begin
  perform private.require_user();
  select * into v_driver from public.drivers where user_id = p_driver for update;
  if v_driver.user_id is null or not public.can_in_org(v_driver.org_id, 'manage_drivers') or not public.is_current_driver(v_driver.org_id, p_driver) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.drivers set paused = p_paused where user_id = p_driver;
end;
$$;
