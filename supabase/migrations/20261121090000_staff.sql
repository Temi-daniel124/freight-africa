-- Phase 1 slice 5: Freight Africa staff and their two-step sign-in (DATA-MODEL.md §2 staff_members and
-- invites; ROLES-AND-PERMISSIONS.md §7 and §8; SECURITY.md §3; ux-admin.md X-00).

create type public.staff_role as enum ('super_admin', 'operations', 'verification', 'finance', 'support', 'field_agent');

create table public.staff_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  -- Operations and field agents can be limited to corridors; null means all. (The corridors table arrives
  -- with the catalogue; the ids are checked there.)
  corridor_ids uuid[],
  mfa_required boolean not null default true check (mfa_required),
  active boolean not null default true,
  staff_code_accepted_at timestamptz,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_members_touch before update on public.staff_members for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------------------------------
-- is_staff (DATA-MODEL §12): an active staff member whose session has passed two-step sign-in (aal2).
-- A staff member signed in with only the first step is treated as nobody, so a stolen email code alone
-- opens nothing.
-- ---------------------------------------------------------------------------------------------------

create function public.is_staff(p_role public.staff_role default null) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2' and exists (
    select 1 from public.staff_members s
    join public.profiles p on p.id = s.user_id and p.status = 'active' and p.deleted_at is null
    where s.user_id = (select auth.uid()) and s.active and (p_role is null or s.role = p_role)
  );
$$;

-- Several roles at once ("super admin or finance").
create function public.is_staff_in(p_roles public.staff_role[]) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2' and exists (
    select 1 from public.staff_members s
    join public.profiles p on p.id = s.user_id and p.status = 'active' and p.deleted_at is null
    where s.user_id = (select auth.uid()) and s.active and s.role = any (p_roles)
  );
$$;

-- What the console needs before two-step sign-in is done: is this person staff at all, and which role.
-- (It reveals only the caller's own staff role.)
create function public.my_staff_role() returns public.staff_role language sql stable security definer set search_path = '' as $$
  select s.role from public.staff_members s where s.user_id = (select auth.uid()) and s.active;
$$;

revoke all on function public.is_staff(public.staff_role) from public;
revoke all on function public.is_staff_in(public.staff_role[]) from public;
revoke all on function public.my_staff_role() from public;
grant execute on function public.is_staff(public.staff_role) to authenticated;
grant execute on function public.is_staff_in(public.staff_role[]) to authenticated;
grant execute on function public.my_staff_role() to authenticated;

alter table public.staff_members enable row level security;
-- Staff see who their colleagues are (names come from profiles through staff functions later); super
-- admins manage them. Everyone sees their own row, even before two-step sign-in, to know what to set up.
create policy "staff_members: own row" on public.staff_members for select to authenticated using (user_id = (select auth.uid()));
create policy "staff_members: staff read" on public.staff_members for select to authenticated using ((select public.is_staff()));
grant select on public.staff_members to authenticated;
grant select, insert, update, delete on public.staff_members to service_role;

-- Staff read people's own data (ROLES-AND-PERMISSIONS §6 "Staff: everyone"; §7 users and companies).
create policy "profiles: staff read" on public.profiles for select to authenticated using ((select public.is_staff()));
create policy "organizations: staff read" on public.organizations for select to authenticated using ((select public.is_staff()));
create policy "organization_members: staff read" on public.organization_members for select to authenticated using ((select public.is_staff()));
create policy "consents: staff read" on public.consents for select to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------------
-- Staff invites (X-24 → X-00): kind 'staff', no organisation, sent to an email, valid 48 hours.
-- ---------------------------------------------------------------------------------------------------

alter table public.invites alter column org_id drop not null;
alter table public.invites drop constraint invites_kind_check;
alter table public.invites add constraint invites_kind_check check (kind in ('team_member', 'driver', 'staff'));
alter table public.invites add constraint invites_staff_shape check (
  (kind = 'staff') = (org_id is null) and (kind <> 'staff' or (email is not null and role_payload ? 'staff_role'))
);
create unique index invites_open_staff on public.invites (email) where kind = 'staff' and accepted_at is null and revoked_at is null;
create policy "invites: super admins read staff invites" on public.invites for select to authenticated
  using (kind = 'staff' and (select public.is_staff('super_admin')));

-- X-24: a super admin adds a staff member. Returns the link token once; only its hash is stored.
create function public.create_staff_invite(p_email text, p_role public.staff_role, p_corridor_ids uuid[] default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_email text := lower(nullif(btrim(p_email), ''));
  v_token text;
begin
  if not public.is_staff('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'an email is needed' using errcode = '22023';
  end if;
  if exists (select 1 from public.staff_members s join public.profiles p on p.id = s.user_id where p.email = v_email) then
    raise exception 'already staff' using errcode = '23505';
  end if;
  update public.invites set revoked_at = now() where kind = 'staff' and email = v_email and accepted_at is null and revoked_at is null;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.invites (kind, org_id, email, role_payload, token_hash, invited_by, expires_at)
  values (
    'staff', null, v_email,
    jsonb_build_object('staff_role', p_role, 'corridor_ids', coalesce(to_jsonb(p_corridor_ids), 'null'::jsonb)),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_user,
    now() + interval '48 hours'
  );
  return v_token;
end;
$$;

-- X-00 step 2: the invited person, signed in with the email the invite went to (confirmed by Supabase
-- Auth), becomes staff. Two-step sign-in comes next; until then is_staff() stays false for them.
create function public.accept_staff_invite(p_token text) returns public.staff_role language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_invite public.invites;
  v_me auth.users;
  v_role public.staff_role;
begin
  select * into v_invite from public.invites
  where kind = 'staff' and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;
  if v_invite.id is null or v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'this invite can no longer be used' using errcode = 'P0002';
  end if;
  select * into v_me from auth.users where id = v_user;
  if v_me.email_confirmed_at is null or lower(v_me.email) is distinct from v_invite.email then
    raise exception 'this invite was sent to someone else' using errcode = '42501';
  end if;
  v_role := (v_invite.role_payload ->> 'staff_role')::public.staff_role;
  insert into public.staff_members (user_id, role, corridor_ids, invited_by)
  values (
    v_user, v_role,
    case when jsonb_typeof(v_invite.role_payload -> 'corridor_ids') = 'array'
      then array(select jsonb_array_elements_text(v_invite.role_payload -> 'corridor_ids')::uuid) end,
    v_invite.invited_by
  )
  on conflict (user_id) do nothing;
  if not found then
    raise exception 'already staff' using errcode = '23505';
  end if;
  update public.invites set accepted_by = v_user, accepted_at = now() where id = v_invite.id;
  return v_role;
end;
$$;

-- What the staff invite page shows before sign-in (X-00 step 1): role and state only.
create function public.staff_invite_details(p_token text) returns table (role public.staff_role, state text)
language sql stable security definer set search_path = '' as $$
  select
    (i.role_payload ->> 'staff_role')::public.staff_role,
    case
      when i.accepted_at is not null then 'used'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      else 'open'
    end
  from public.invites i
  where i.kind = 'staff' and i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- X-00 step 4: the staff code is read and agreed.
create function public.accept_staff_code() returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.staff_members set staff_code_accepted_at = now() where user_id = (select auth.uid()) and staff_code_accepted_at is null;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Backup codes (X-00 step 3): ten one-time codes for a lost authenticator, 16 characters each (about 79
-- bits, so even a leaked table can't be worked back by guessing). Only hashes are kept; a new
-- set replaces the old. Using one doesn't sign anyone in by itself: the server then removes the lost
-- authenticator so the person sets up a new one (and gets aal2 that way).
-- ---------------------------------------------------------------------------------------------------

create table private.staff_backup_codes (
  user_id uuid not null references public.staff_members (user_id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, code_hash)
);

-- New codes need a fresh two-step session (aal2), so someone with only an email code can't mint them.
-- The first set is made right after the authenticator is confirmed, which is itself aal2.
create function public.new_staff_backup_codes() returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_codes text[] := '{}';
  v_code text;
  i int;
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from private.staff_backup_codes where user_id = v_user;
  for i in 1..10 loop
    -- 16 characters from an alphabet without look-alikes (no 0/O, 1/I/L), shown as XXXX-XXXX-XXXX-XXXX.
    v_code := (
      select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, n) % 31), 1), '' order by n)
      from (select extensions.gen_random_bytes(16) as b) r, generate_series(0, 15) as n
    );
    insert into private.staff_backup_codes (user_id, code_hash) values (v_user, encode(extensions.digest(v_code, 'sha256'), 'hex'));
    v_codes := v_codes || (substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4) || '-' || substr(v_code, 13, 4));
  end loop;
  return v_codes;
end;
$$;

-- How many unused codes are left (X-29 shows it).
create function public.staff_backup_codes_left() returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from private.staff_backup_codes where user_id = (select auth.uid()) and used_at is null;
$$;

-- Lost authenticator: spends one code. Only for staff, from the first-step session. Five wrong tries an
-- hour lock it (counted per person). Returns true if the code was good; the server then removes the
-- authenticator with the admin API so a new one can be set up.
create table private.staff_backup_code_tries (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index staff_backup_code_tries_user_at on private.staff_backup_code_tries (user_id, at desc);

create function public.use_staff_backup_code(p_code text) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_hash text := encode(extensions.digest(upper(replace(btrim(coalesce(p_code, '')), '-', '')), 'sha256'), 'hex');
begin
  if public.my_staff_role() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if (select count(*) from private.staff_backup_code_tries where user_id = v_user and at > now() - interval '1 hour') >= 5 then
    raise exception 'too many tries' using errcode = '54000';
  end if;
  update private.staff_backup_codes set used_at = now() where user_id = v_user and code_hash = v_hash and used_at is null;
  if found then
    return true;
  end if;
  insert into private.staff_backup_code_tries (user_id) values (v_user);
  return false;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.create_staff_invite(text, public.staff_role, uuid[])',
    'public.accept_staff_invite(text)',
    'public.accept_staff_code()',
    'public.new_staff_backup_codes()',
    'public.staff_backup_codes_left()',
    'public.use_staff_backup_code(text)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
revoke all on function public.staff_invite_details(text) from public;
grant execute on function public.staff_invite_details(text) to anon, authenticated;

-- The first super admin: the founder (CLAUDE.md §1), if that account exists. Every later staff member is
-- invited from the console. A no-op on a fresh database (CI) and when run again.
-- Only if Supabase Auth has confirmed that email, so an unconfirmed sign-up with it gets nothing.
insert into public.staff_members (user_id, role)
select p.id, 'super_admin'
from public.profiles p
join auth.users u on u.id = p.id
where p.email = 'temmydaniel124@gmail.com' and lower(u.email) = p.email and u.email_confirmed_at is not null
on conflict (user_id) do nothing;
