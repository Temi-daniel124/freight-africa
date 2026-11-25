-- D044 / SECURITY §3: sensitive actions need a fresh check. Team role changes first; bank account
-- changes and payouts use the same rule when their screens are built.
-- A fresh check is recorded by our server only when the person passes it (the authenticator code or an
-- email code, src/features/auth/fresh-actions.ts), for that session, and lasts 15 minutes. A sign-in by
-- PIN never counts as one (security review).
create table private.fresh_checks (
  session_id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now()
);
create table private.fresh_tries (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index fresh_tries_user_at on private.fresh_tries (user_id, at desc);

create function private.fresh_ok() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.fresh_checks
    where user_id = (select auth.uid())
      and session_id::text = coalesce((select auth.jwt() ->> 'session_id'), '')
      and at > now() - interval '15 minutes'
  );
$$;
revoke all on function private.fresh_ok() from public;

-- Server only: the person passed the fresh check in this session.
create function public.record_fresh_check(p_user uuid, p_session uuid) returns void language sql security definer set search_path = '' as $$
  insert into private.fresh_checks (session_id, user_id) values (p_session, p_user)
  on conflict (session_id) do update set at = now(), user_id = excluded.user_id;
  delete from private.fresh_tries where user_id = p_user;
$$;

-- Server only: a wrong authenticator code in the fresh check. False once five wrong codes in an hour.
create function public.fresh_try(p_user uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.fresh_tries where user_id = p_user and at > now() - interval '1 hour') >= 5 then
    return false;
  end if;
  insert into private.fresh_tries (user_id) values (p_user);
  return true;
end;
$$;
revoke all on function public.record_fresh_check(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_fresh_check(uuid, uuid) to service_role;
revoke all on function public.fresh_try(uuid) from public, anon, authenticated;
grant execute on function public.fresh_try(uuid) to service_role;

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
  if not private.fresh_ok() then
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

create or replace function public.create_invite(p_org uuid, p_role text, p_phone text default null, p_email text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_role record;
  v_phone text := nullif(btrim(p_phone), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_token text;
begin
  if not public.is_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_role from private.parse_role(p_org, p_role);
  -- Inviting someone as an owner or admin grants a team role: it needs a fresh check (D044, review).
  if coalesce(v_role.o_shipper::text, v_role.o_transporter::text, '') in ('owner', 'admin', 'manager') and not private.fresh_ok() then
    raise exception 'confirm it is you first' using errcode = '28000';
  end if;
  if not private.can_grant(p_org, v_role.o_shipper, v_role.o_transporter) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_phone is null and v_email is null then
    raise exception 'a phone number or email is needed' using errcode = '22023';
  end if;
  -- Ten invites an hour per organisation is plenty for a real team and stops a flood.
  if (select count(*) from public.invites where org_id = p_org and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many invites' using errcode = '54000';
  end if;
  -- Someone already in the organisation doesn't need an invite.
  if exists (
    select 1 from public.organization_members m join public.profiles p on p.id = m.user_id
    where m.org_id = p_org and ((v_phone is not null and p.phone = v_phone) or (v_email is not null and p.email = v_email))
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  -- A new invite replaces an open one for the same person.
  update public.invites set revoked_at = now()
  where org_id = p_org and accepted_at is null and revoked_at is null
    and ((v_phone is not null and phone = v_phone) or (v_email is not null and email = v_email));
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.invites (kind, org_id, phone, email, role_payload, token_hash, invited_by)
  values (
    case when v_role.o_transporter = 'driver' then 'driver' else 'team_member' end,
    p_org, v_phone, v_email,
    case when v_role.o_shipper is not null then jsonb_build_object('shipper_role', v_role.o_shipper) else jsonb_build_object('transporter_role', v_role.o_transporter) end,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_user
  );
  return v_token;
end;
$$;

create or replace function public.remove_member(p_org uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := private.require_user();
  v_member public.organization_members;
begin
  if not public.is_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = p_org for no key update;
  -- Removing someone else changes the team: it needs a fresh check (leaving yourself doesn't).
  if p_user <> v_me and not private.fresh_ok() then
    raise exception 'confirm it is you first' using errcode = '28000';
  end if;
  select * into v_member from public.organization_members where org_id = p_org and user_id = p_user for update;
  if v_member.user_id is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user <> v_me and not private.can_grant(p_org, v_member.shipper_role, v_member.transporter_role) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.organization_members where org_id = p_org and user_id = p_user;
  update public.profiles set last_active_org_id = null where id = p_user and last_active_org_id = p_org;
end;
$$;
