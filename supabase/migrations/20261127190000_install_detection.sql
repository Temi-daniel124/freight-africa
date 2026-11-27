-- Combined brief slice 7, D052: real install detection. Tapping Install, or the browser saying
-- "accepted", only moves to Waiting. A device counts as installed only when the app runs from the home
-- screen (standalone) and that installed app checks in. On iPhone the home-screen app starts signed
-- out, so the driver makes a one-time 6-digit setup code (30 minutes, stored hashed, used once) in the
-- browser and types it, with their phone number, into the home-screen app.

create table public.app_installs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- A random id the app keeps on the device (not a fingerprint).
  device_id uuid not null,
  platform text not null check (platform in ('android', 'ios', 'desktop', 'other')),
  state text not null default 'waiting' check (state in ('waiting', 'installed')),
  started_at timestamptz not null default now(),
  installed_at timestamptz,
  last_seen_at timestamptz,
  unique (user_id, device_id),
  check ((state = 'installed') = (installed_at is not null))
);
alter table public.app_installs enable row level security;
create policy "app installs: own" on public.app_installs for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.app_installs from anon, authenticated;
grant select on public.app_installs to authenticated;
grant select, insert, update, delete on public.app_installs to service_role;

-- DV05 Install tapped (or "accepted"): Waiting, never Installed.
create function public.install_started(p_device uuid, p_platform text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if (select count(*) from public.app_installs where user_id = v_user) >= 20 and not exists (select 1 from public.app_installs where user_id = v_user and device_id = p_device) then
    raise exception 'too many devices' using errcode = '22023';
  end if;
  insert into public.app_installs (user_id, device_id, platform) values (v_user, p_device, p_platform)
  on conflict (user_id, device_id) do update set platform = excluded.platform
    where public.app_installs.state = 'waiting';
end;
$$;

-- DV05e: the installed app itself, running standalone, checks in. Returns true once installed.
create function public.install_checkin(p_device uuid, p_platform text, p_standalone boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not coalesce(p_standalone, false) then
    -- A browser tab is never an install.
    update public.app_installs set last_seen_at = now() where user_id = v_user and device_id = p_device;
    return exists (select 1 from public.app_installs where user_id = v_user and state = 'installed');
  end if;
  if (select count(*) from public.app_installs where user_id = v_user) >= 20 and not exists (select 1 from public.app_installs where user_id = v_user and device_id = p_device) then
    raise exception 'too many devices' using errcode = '22023';
  end if;
  insert into public.app_installs (user_id, device_id, platform, state, installed_at, last_seen_at)
  values (v_user, p_device, p_platform, 'installed', now(), now())
  on conflict (user_id, device_id) do update set state = 'installed', platform = excluded.platform,
    installed_at = coalesce(public.app_installs.installed_at, now()), last_seen_at = now();
  return true;
end;
$$;

-- iPhone setup codes: one live code per person; five wrong tries end it.
create table private.install_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  tries int not null default 0,
  created_at timestamptz not null default now()
);

create table private.install_code_issues (
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index install_code_issues_user on private.install_code_issues (user_id, created_at);

-- DV05d: make the code in the browser (signed in). At most 5 an hour. Secure random digits.
create function public.create_install_code() returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_bytes bytea := extensions.gen_random_bytes(4);
  v_code text := lpad(((((get_byte(v_bytes, 0)::bigint << 24) | (get_byte(v_bytes, 1)::bigint << 16) | (get_byte(v_bytes, 2)::bigint << 8) | get_byte(v_bytes, 3)) % 1000000))::text, 6, '0');
  v_recent int;
begin
  perform pg_advisory_xact_lock(hashtext('install-code:' || v_user::text));
  select count(*) into v_recent from private.install_code_issues where user_id = v_user and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'too many codes; try again in an hour' using errcode = '22023';
  end if;
  insert into private.install_codes (user_id, code_hash, expires_at) values (v_user, extensions.crypt(v_code, extensions.gen_salt('bf', 8)), now() + interval '30 minutes')
  on conflict (user_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0, created_at = now();
  insert into private.install_code_issues (user_id) values (v_user);
  return v_code;
end;
$$;

-- Server only (the home-screen app, signed out): phone number and code. Returns the person's id once,
-- then the code is gone. A wrong code counts a try; five tries end the code.
create table private.install_redeem_attempts (
  phone text not null,
  created_at timestamptz not null default now()
);
create index install_redeem_attempts_phone on private.install_redeem_attempts (phone, created_at);

create function public.redeem_install_code(p_phone text, p_code text) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_row private.install_codes;
  -- Every path does one bcrypt, so the time taken doesn't say which numbers have a live code (review).
  v_dummy constant text := '$2a$08$0123456789012345678901uJ6yq7Lq3fYc6QFz9i0m6kz2V7pJ6W1u';
  v_well_formed boolean := coalesce(p_code, '') ~ '^[0-9]{6}$';
begin
  -- At most 10 tries for a number in 15 minutes, whoever makes them (the server also limits by address).
  perform pg_advisory_xact_lock(hashtext('install-redeem:' || coalesce(p_phone, '')));
  if (select count(*) from private.install_redeem_attempts where phone = coalesce(p_phone, '') and created_at > now() - interval '15 minutes') >= 10 then
    perform extensions.crypt(coalesce(p_code, ''), v_dummy);
    return null;
  end if;
  insert into private.install_redeem_attempts (phone) values (coalesce(p_phone, ''));
  select id into v_user from public.profiles where phone = p_phone and deleted_at is null;
  if v_user is not null then
    select * into v_row from private.install_codes where user_id = v_user for update;
  end if;
  if v_user is null or v_row.user_id is null or v_row.expires_at < now() or v_row.tries >= 5 then
    perform extensions.crypt(coalesce(p_code, ''), v_dummy);
    return null;
  end if;
  -- A missing or malformed code is a wrong code (crypt of NULL is NULL, which would otherwise pass; review).
  if not v_well_formed or extensions.crypt(p_code, v_row.code_hash) is distinct from v_row.code_hash then
    update private.install_codes set tries = tries + 1 where user_id = v_user;
    return null;
  end if;
  delete from private.install_codes where user_id = v_user;
  return v_user;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.install_started(uuid, text)', 'public.install_checkin(uuid, text, boolean)', 'public.create_install_code()'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  execute 'revoke all on function public.redeem_install_code(text, text) from public, anon, authenticated';
  execute 'grant execute on function public.redeem_install_code(text, text) to service_role';
end;
$$;
