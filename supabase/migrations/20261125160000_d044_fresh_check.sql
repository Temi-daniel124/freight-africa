-- D044 / SECURITY §3: sensitive actions need a fresh check. Team role changes first; bank account
-- changes and payouts use the same rule when their screens are built.
create or replace function public.change_member_role(p_org uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_member public.organization_members;
  v_role record;
begin
  perform private.require_user();
  -- Outsiders learn nothing about the organisation, not even its kind.
  if not public.is_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = p_org for no key update;
  select * into v_member from public.organization_members where org_id = p_org and user_id = p_user for update;
  if v_member.user_id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_role from private.parse_role(p_org, p_role);
  if not private.can_grant(p_org, v_member.shipper_role, v_member.transporter_role)
    or not private.can_grant(p_org, v_role.o_shipper, v_role.o_transporter) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- D044 / SECURITY §3: a role change needs a fresh check (the authenticator code with two-step on,
  -- otherwise an email code) in the last 15 minutes.
  if not private.signed_in_within(900) then
    raise exception 'confirm it is you first' using errcode = '28000';
  end if;
  -- A driver is added as a driver (licence and identity checks follow); other roles don't change into one.
  if (v_member.transporter_role = 'driver') <> (v_role.o_transporter is not distinct from 'driver') then
    raise exception 'drivers are added and removed, not changed' using errcode = '22023';
  end if;
  update public.organization_members
  set shipper_role = v_role.o_shipper, transporter_role = v_role.o_transporter
  where org_id = p_org and user_id = p_user;
end;
$$;

-- Two-person rule for payouts: remember who caused each payout (the trip step, cancellation or release).
alter table public.payouts add column requested_by uuid references public.profiles (id) default auth.uid();

create or replace function public.approve_money_out(p_kind text, p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_requested uuid;
begin
  if coalesce(public.my_staff_role()::text, '') not in ('finance', 'super_admin') or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind = 'refund' then
    select requested_by into v_requested from public.refunds where id = p_id and status = 'awaiting_approval';
    if v_requested = v_user then
      raise exception 'a second person approves it' using errcode = '42501';
    end if;
    update public.refunds set status = 'queued', approved_by = v_user where id = p_id and status = 'awaiting_approval';
  elsif p_kind = 'payout' then
    -- The person whose action released the money can't also approve sending it (security review).
    if exists (select 1 from public.payouts where id = p_id and requested_by = v_user) then
      raise exception 'a second person approves it' using errcode = '42501';
    end if;
    update public.payouts set status = 'queued', approved_by = v_user where id = p_id and status = 'awaiting_approval';
  else
    raise exception 'refund or payout' using errcode = '22023';
  end if;
  perform private.audit('money_out.approved', p_kind || 's', p_id::text, null, null);
end;
$$;
