-- Phase 1 slice 4: organisations, members with every sub-role, invites and the account switcher's data
-- (DATA-MODEL.md §2 and §12; ROLES-AND-PERMISSIONS.md §1 to §3; ux-public-and-auth.md A-07 and A-09;
-- ux-shipper.md S-20). Staff access is added with staff_members in slice 5.

create type public.org_kind as enum ('shipper', 'transporter');
create type public.shipper_role as enum ('owner', 'admin', 'booker', 'finance', 'viewer');
create type public.transporter_role as enum ('owner', 'manager', 'driver');
create type public.owner_tier as enum ('new', 'established', 'gold');

-- ---------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------

-- A shipper or transporter business, or one person on their own ("Individuals are the owner of their own
-- organisation"). City, bank account and agent referral columns arrive with their tables.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  cac_number text check (cac_number is null or cac_number ~ '^[A-Za-z]{0,4}[0-9]{1,12}$'),
  logo_path text check (logo_path is null or char_length(logo_path) <= 300),
  status public.account_status not null default 'active',
  tier public.owner_tier check (tier is null or kind = 'transporter'),
  insured_until date check (insured_until is null or kind = 'transporter'),
  blocked_reason text check (blocked_reason is null or char_length(blocked_reason) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_touch before update on public.organizations for each row execute function private.touch_updated_at();

-- One row per person per organisation, with exactly one sub-role of the organisation's kind.
create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  shipper_role public.shipper_role,
  transporter_role public.transporter_role,
  -- Drivers and owner-drivers (ROLES-AND-PERMISSIONS §3).
  is_driver boolean not null default false,
  invited_by uuid references public.profiles (id) on delete set null,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint one_sub_role check ((shipper_role is null) <> (transporter_role is null)),
  constraint drivers_are_transporters check (not is_driver or transporter_role is not null),
  constraint driver_role_drives check (transporter_role is distinct from 'driver' or is_driver)
);

create index organization_members_user on public.organization_members (user_id);
create trigger organization_members_touch before update on public.organization_members for each row execute function private.touch_updated_at();

-- The sub-role must match the organisation's kind (a check constraint can't look at another table).
create function private.member_matches_kind() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.org_kind;
begin
  select kind into v_kind from public.organizations where id = new.org_id;
  if (v_kind = 'shipper' and new.shipper_role is null) or (v_kind = 'transporter' and new.transporter_role is null) then
    raise exception 'the role does not match the organisation' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.member_matches_kind() from public;
create trigger organization_members_kind before insert or update on public.organization_members
  for each row execute function private.member_matches_kind();

-- "An organisation always has at least one owner." Checked at the end of the transaction, so an owner can
-- be added and another changed in one go; deleting the whole organisation is not blocked.
create function private.keep_an_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Lock the organisation first: two owners leaving at the same moment then check one after the other,
  -- and the second sees the first's change (otherwise both could pass and leave no owner).
  perform 1 from public.organizations where id = old.org_id for update;
  if found
    and not exists (
      select 1 from public.organization_members m
      where m.org_id = old.org_id and m.status = 'active' and (m.shipper_role = 'owner' or m.transporter_role = 'owner')
    ) then
    raise exception 'an organisation must keep at least one owner' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.keep_an_owner() from public;
create constraint trigger organization_members_keep_owner after update or delete on public.organization_members
  deferrable initially deferred for each row execute function private.keep_an_owner();

-- Team and driver invites. The link carries a random token; only its SHA-256 is stored, so a database
-- reader can't use an invite. Agent referrals and staff invites arrive with agents (Phase 6) and staff
-- (slice 5).
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('team_member', 'driver')),
  org_id uuid not null references public.organizations (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (email is null or (char_length(email) between 3 and 254 and email = lower(email) and email like '%_@_%')),
  -- The sub-role to grant: {"shipper_role": "booker"} or {"transporter_role": "driver"}.
  role_payload jsonb not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invite_has_contact check (phone is not null or email is not null),
  constraint invite_closed_once check (accepted_at is null or revoked_at is null)
);

create index invites_org on public.invites (org_id, created_at desc);
-- One open invite per person per organisation: a new one replaces the old.
create unique index invites_open_phone on public.invites (org_id, phone) where accepted_at is null and revoked_at is null and phone is not null;
create unique index invites_open_email on public.invites (org_id, email) where accepted_at is null and revoked_at is null and email is not null;

-- The account switcher remembers the last organisation used (it must be one of the person's own).
alter table public.profiles
  add constraint profiles_last_active_org_fk foreign key (last_active_org_id) references public.organizations (id) on delete set null;
revoke update (last_active_org_id) on public.profiles from authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Helpers (DATA-MODEL §12): stable, security definer, about the signed-in person only
-- ---------------------------------------------------------------------------------------------------

create function public.is_member(p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.status = 'active'
  );
$$;

-- 'owner', 'admin', 'booker', 'finance' or 'viewer' in a shipper organisation; 'owner', 'manager' or 'driver'
-- in a transporter organisation; null for anyone else.
create function public.member_role(p_org uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce(m.shipper_role::text, m.transporter_role::text)
  from public.organization_members m
  where m.org_id = p_org and m.user_id = (select auth.uid()) and m.status = 'active';
$$;

-- Every row of ROLES-AND-PERMISSIONS §2 (shipper) and §3 (transporter), in one place. Later slices call this
-- from their RLS policies and server functions instead of repeating the table. Unknown actions are false.
create function public.can_in_org(p_org uuid, p_action text) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when m.shipper_role is not null then
        case p_action
          when 'book' then m.shipper_role in ('owner', 'admin', 'booker')
          when 'pay' then m.shipper_role in ('owner', 'admin', 'booker', 'finance')
          when 'decide_offers' then m.shipper_role in ('owner', 'admin', 'booker')
          when 'cancel_any_booking' then m.shipper_role in ('owner', 'admin')
          when 'cancel_own_booking' then m.shipper_role in ('owner', 'admin', 'booker')
          when 'see_codes' then m.shipper_role in ('owner', 'admin', 'booker')
          when 'see_trip_phones' then m.shipper_role in ('owner', 'admin', 'booker')
          when 'report_and_rate' then m.shipper_role in ('owner', 'admin', 'booker')
          when 'see_money' then m.shipper_role in ('owner', 'admin', 'finance')
          when 'manage_team' then m.shipper_role in ('owner', 'admin')
          when 'edit_business' then m.shipper_role in ('owner', 'admin')
          when 'view_business' then true
          when 'view_trips' then true
          else false
        end
      else
        case p_action
          when 'load_board' then m.transporter_role in ('owner', 'manager')
          when 'suggest_load' then m.transporter_role = 'driver'
          when 'assign' then m.transporter_role in ('owner', 'manager')
          when 'manage_trucks' then m.transporter_role in ('owner', 'manager')
          when 'own_licence' then m.is_driver
          when 'manage_drivers' then m.transporter_role in ('owner', 'manager')
          -- Drivers never see money (D003), even an owner-driver's driver screens get it from the owner side.
          when 'see_money' then m.transporter_role in ('owner', 'manager')
          when 'bank_account' then m.transporter_role = 'owner'
          when 'manage_managers' then m.transporter_role = 'owner'
          when 'edit_business' then m.transporter_role = 'owner'
          when 'view_business' then m.transporter_role in ('owner', 'manager')
          when 'respond_disputes' then m.transporter_role in ('owner', 'manager')
          when 'rate_sender' then m.transporter_role in ('owner', 'manager')
          when 'run_trip' then m.is_driver
          -- Drivers, and owner-drivers, who get "the owner rights plus the driver screens" (§3).
          when 'confirm_trip' then m.is_driver
          -- Loading and delivery codes come from the other side in person: never shown to the transporter.
          when 'see_codes' then false
          when 'view_trips' then true
          else false
        end
    end
    from public.organization_members m
    join public.organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.status = 'active' and o.status <> 'banned'
  ), false);
$$;

-- Everything the signed-in person may do in one organisation, so the app can hide what they can't
-- (the server still checks every action).
create function public.org_permissions(p_org uuid) returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a order by a collate "C"), '{}')
  from unnest(array[
    'book', 'pay', 'decide_offers', 'cancel_any_booking', 'cancel_own_booking', 'see_codes', 'see_trip_phones',
    'report_and_rate', 'see_money', 'manage_team', 'edit_business', 'view_business', 'view_trips', 'load_board',
    'suggest_load', 'assign', 'manage_trucks', 'own_licence', 'manage_drivers', 'bank_account', 'manage_managers',
    'respond_disputes', 'rate_sender', 'run_trip', 'confirm_trip'
  ]) as a
  where public.can_in_org(p_org, a);
$$;

revoke all on function public.is_member(uuid) from public;
revoke all on function public.member_role(uuid) from public;
revoke all on function public.can_in_org(uuid, text) from public;
revoke all on function public.org_permissions(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.member_role(uuid) to authenticated;
grant execute on function public.can_in_org(uuid, text) to authenticated;
grant execute on function public.org_permissions(uuid) to authenticated;

-- May the signed-in person grant this sub-role here? Shipper: owner and admin manage the team, but only an
-- owner makes another owner. Transporter: owners add managers; owners and managers add drivers.
create function private.can_grant(p_org uuid, p_shipper public.shipper_role, p_transporter public.transporter_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_shipper is not null then public.can_in_org(p_org, 'manage_team') and (p_shipper <> 'owner' or public.member_role(p_org) = 'owner')
    when p_transporter = 'driver' then public.can_in_org(p_org, 'manage_drivers')
    when p_transporter is not null then public.can_in_org(p_org, 'manage_managers')
    else false
  end;
$$;
revoke all on function private.can_grant(uuid, public.shipper_role, public.transporter_role) from public;

-- The same rule for a stored role payload, callable from RLS policies (authenticated can't use private).
create function public.can_grant_role(p_org uuid, p_payload jsonb) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_grant(p_org, (p_payload ->> 'shipper_role')::public.shipper_role, (p_payload ->> 'transporter_role')::public.transporter_role);
$$;
revoke all on function public.can_grant_role(uuid, jsonb) from public;
grant execute on function public.can_grant_role(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Row level security: members read their own organisation; every write goes through the functions below
-- ---------------------------------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invites enable row level security;

create policy "organizations: members read" on public.organizations for select to authenticated using (public.is_member(id));
create policy "organization_members: members read their organisation" on public.organization_members for select to authenticated
  using (public.is_member(org_id));
-- Open and past invites, each visible only to people who could send that invite themselves (a manager
-- sees driver invites, not invites for other managers). The token hash is never readable.
create policy "invites: people who could send them read" on public.invites for select to authenticated
  using (public.can_grant_role(org_id, role_payload));

-- blocked_reason is internal (staff explain it); members read everything else.
grant select (id, kind, name, cac_number, logo_path, status, tier, insured_until, created_by, created_at, updated_at) on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select (id, kind, org_id, phone, email, role_payload, invited_by, expires_at, accepted_by, accepted_at, revoked_at, created_at) on public.invites to authenticated;
grant select, insert, update, delete on public.organizations, public.organization_members, public.invites to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Server functions
-- ---------------------------------------------------------------------------------------------------

create function private.require_user() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user and deleted_at is null and status = 'active') then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  return v_user;
end;
$$;
revoke all on function private.require_user() from public;

-- A-04 / transporter onboarding: the signed-in person makes an organisation and becomes its owner (an
-- owner-driver when p_is_driver). It becomes their active account.
create function public.create_organization(p_kind public.org_kind, p_name text, p_cac_number text default null, p_is_driver boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_org uuid;
begin
  if p_kind = 'shipper' and coalesce(p_is_driver, false) then
    raise exception 'only truck owners drive' using errcode = '22023';
  end if;
  -- A person can own a handful of organisations; more is almost always a mistake or abuse.
  if (select count(*) from public.organization_members where user_id = v_user and (shipper_role = 'owner' or transporter_role = 'owner')) >= 5 then
    raise exception 'too many organisations' using errcode = '54000';
  end if;
  insert into public.organizations (kind, name, cac_number, created_by, tier)
  values (p_kind, btrim(p_name), nullif(btrim(p_cac_number), ''), v_user, case when p_kind = 'transporter' then 'new'::public.owner_tier end)
  returning id into v_org;
  insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver)
  values (
    v_org, v_user,
    case when p_kind = 'shipper' then 'owner'::public.shipper_role end,
    case when p_kind = 'transporter' then 'owner'::public.transporter_role end,
    coalesce(p_is_driver, false)
  );
  update public.profiles set last_active_org_id = v_org where id = v_user;
  return v_org;
end;
$$;

-- Business name and CAC number (owner and admin in shippers; owner in transporters).
create function public.update_organization(p_org uuid, p_name text, p_cac_number text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not public.can_in_org(p_org, 'edit_business') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.organizations set name = btrim(p_name), cac_number = nullif(btrim(p_cac_number), '') where id = p_org;
end;
$$;

-- Reads a role name for this organisation's kind, or fails.
create function private.parse_role(p_org uuid, p_role text, out o_shipper public.shipper_role, out o_transporter public.transporter_role)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_kind public.org_kind;
begin
  select kind into v_kind from public.organizations where id = p_org;
  if v_kind = 'shipper' and p_role in ('owner', 'admin', 'booker', 'finance', 'viewer') then
    o_shipper := p_role::public.shipper_role;
  elsif v_kind = 'transporter' and p_role in ('owner', 'manager', 'driver') then
    o_transporter := p_role::public.transporter_role;
  else
    raise exception 'unknown role for this organisation' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.parse_role(uuid, text) from public;

-- S-20 / T-16: invite someone by phone or email. Returns the link token once; only its hash is kept.
-- Sending the WhatsApp, SMS or email is the server's job (notify(), slice 8).
create function public.create_invite(p_org uuid, p_role text, p_phone text default null, p_email text default null) returns text
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

create function public.revoke_invite(p_invite uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
begin
  perform private.require_user();
  select * into v_invite from public.invites where id = p_invite;
  if v_invite.id is null or not private.can_grant(
    v_invite.org_id, (v_invite.role_payload ->> 'shipper_role')::public.shipper_role, (v_invite.role_payload ->> 'transporter_role')::public.transporter_role
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.invites set revoked_at = now() where id = p_invite and accepted_at is null and revoked_at is null;
end;
$$;

-- A-07: what the invite page shows, before sign-in. Only the organisation's name, the inviter's first
-- name, the role and whether it can still be used: never the contact it was sent to.
create function public.invite_details(p_token text)
returns table (org_name text, org_kind public.org_kind, role text, invited_by_first_name text, state text)
language sql stable security definer set search_path = '' as $$
  select
    o.name,
    o.kind,
    coalesce(i.role_payload ->> 'shipper_role', i.role_payload ->> 'transporter_role'),
    nullif(split_part(btrim(coalesce(p.full_name, '')), ' ', 1), ''),
    case
      when i.accepted_at is not null then 'used'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      else 'open'
    end
  from public.invites i
  join public.organizations o on o.id = i.org_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- A-07: the signed-in person accepts. The invite must be open and sent to their own verified phone or
-- email, so a forwarded link can't be used by someone else.
create function public.accept_invite(p_token text) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_invite public.invites;
  v_me auth.users;
begin
  select * into v_invite from public.invites
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'this invite can no longer be used' using errcode = 'P0002';
  end if;
  -- Matched against Supabase Auth's own confirmed address, not a copy.
  select * into v_me from auth.users where id = v_user;
  if not (
    (v_invite.phone is not null and v_me.phone_confirmed_at is not null and v_invite.phone = '+' || ltrim(v_me.phone, '+'))
    or (v_invite.email is not null and v_me.email_confirmed_at is not null and v_invite.email = lower(v_me.email))
  ) then
    raise exception 'this invite was sent to someone else' using errcode = '42501';
  end if;
  if exists (select 1 from public.organization_members where org_id = v_invite.org_id and user_id = v_user) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  insert into public.organization_members (org_id, user_id, shipper_role, transporter_role, is_driver, invited_by)
  values (
    v_invite.org_id, v_user,
    (v_invite.role_payload ->> 'shipper_role')::public.shipper_role,
    (v_invite.role_payload ->> 'transporter_role')::public.transporter_role,
    coalesce(v_invite.role_payload ->> 'transporter_role' = 'driver', false),
    v_invite.invited_by
  );
  update public.invites set accepted_by = v_user, accepted_at = now() where id = v_invite.id;
  update public.profiles set last_active_org_id = v_invite.org_id where id = v_user;
  return v_invite.org_id;
end;
$$;

-- S-20: change someone's role. The same rules as inviting apply to both the old and the new role, so an
-- admin can't touch an owner and a manager can't touch another manager.
create function public.change_member_role(p_org uuid, p_user uuid, p_role text) returns void
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
  -- A driver is added as a driver (licence and identity checks follow); other roles don't change into one.
  if (v_member.transporter_role = 'driver') <> (v_role.o_transporter is not distinct from 'driver') then
    raise exception 'drivers are added and removed, not changed' using errcode = '22023';
  end if;
  update public.organization_members
  set shipper_role = v_role.o_shipper, transporter_role = v_role.o_transporter
  where org_id = p_org and user_id = p_user;
end;
$$;

-- S-20: remove someone, or leave. Nobody removes the last owner (the deferred trigger also refuses).
create function public.remove_member(p_org uuid, p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := private.require_user();
  v_member public.organization_members;
begin
  if not public.is_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform 1 from public.organizations where id = p_org for no key update;
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

-- S-20: the team list. Names and roles for every member; phone and email only for people who manage the
-- team (other members never see each other's contact details).
create function public.team_members(p_org uuid)
returns table (user_id uuid, full_name text, role text, is_driver boolean, status public.account_status, phone text, email text, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select
    m.user_id,
    p.full_name,
    coalesce(m.shipper_role::text, m.transporter_role::text),
    m.is_driver,
    m.status,
    case when private.can_grant(p_org, m.shipper_role, m.transporter_role) or m.user_id = (select auth.uid()) then p.phone end,
    case when private.can_grant(p_org, m.shipper_role, m.transporter_role) or m.user_id = (select auth.uid()) then p.email end,
    m.user_id = (select auth.uid())
  from public.organization_members m
  join public.profiles p on p.id = m.user_id
  where m.org_id = p_org and public.is_member(p_org)
  order by (coalesce(m.shipper_role::text, m.transporter_role::text) <> 'owner'), p.full_name nulls last;
$$;

-- A-09: every account the signed-in person can switch to, the active one first.
create function public.my_accounts()
returns table (org_id uuid, name text, kind public.org_kind, role text, is_driver boolean, is_active boolean)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.kind, coalesce(m.shipper_role::text, m.transporter_role::text), m.is_driver, o.id = p.last_active_org_id
  from public.organization_members m
  join public.organizations o on o.id = m.org_id
  join public.profiles p on p.id = m.user_id
  where m.user_id = (select auth.uid()) and m.status = 'active' and o.status <> 'banned'
  order by o.id = p.last_active_org_id desc, o.name;
$$;

-- A-09: switch account. Only to an organisation the person belongs to.
create function public.set_active_org(p_org uuid) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not public.is_member(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles set last_active_org_id = p_org where id = v_user;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_organization(public.org_kind, text, text, boolean)',
    'public.update_organization(uuid, text, text)',
    'public.create_invite(uuid, text, text, text)',
    'public.revoke_invite(uuid)',
    'public.accept_invite(text)',
    'public.change_member_role(uuid, uuid, text)',
    'public.remove_member(uuid, uuid)',
    'public.team_members(uuid)',
    'public.my_accounts()',
    'public.set_active_org(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- The invite page reads its details before sign-in.
revoke all on function public.invite_details(text) from public;
grant execute on function public.invite_details(text) to anon, authenticated;
