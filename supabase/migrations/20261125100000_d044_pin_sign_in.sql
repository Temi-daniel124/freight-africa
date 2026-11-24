-- D044: an email code once per device, then a 6-digit PIN. Supersedes D042 (the PIN only unlocked).
-- The PIN is never a Supabase password: these functions are called only by our server with the
-- service key, which then creates the session itself (admin generateLink + verifyOtp, no email).

-- ---------------------------------------------------------------------------------------------------
-- Obvious PINs: repeated digits, runs up or down, a repeated pair or triple, and a few favourites.
-- ---------------------------------------------------------------------------------------------------
create function private.pin_is_weak(p_pin text) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_pin, '') !~ '^[0-9]{6}$'
    or p_pin ~ '^(.)\1{5}$'
    or p_pin ~ '^(..)\1\1$'
    or p_pin ~ '^(...)\1$'
    or position(p_pin in '01234567890123456789') > 0
    or position(p_pin in '98765432109876543210') > 0
    or p_pin in ('112233', '001122', '102030', '111222', '000111', '123321', '654456', '696969', '101010', '202020', '131313', '200000', '100000');
$$;
revoke all on function private.pin_is_weak(text) from public;

create or replace function public.set_app_pin(p_pin text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if private.pin_is_weak(p_pin) then
    raise exception 'choose a PIN that is harder to guess' using errcode = '22023';
  end if;
  -- Replacing a PIN needs a sign-in in the last 15 minutes (an email code, or a PIN reset link).
  if exists (select 1 from private.app_pins where user_id = v_user) and not private.signed_in_within(900) then
    raise exception 'sign in again to change your PIN' using errcode = '28000';
  end if;
  insert into private.app_pins (user_id, pin_hash, failed, updated_at)
  values (v_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), 0, now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, updated_at = now();
end;
$$;

-- Settings, Change PIN: the current PIN instead of a fresh sign-in. A wrong current PIN counts towards
-- the same lockout of five.
create function public.change_app_pin(p_old text, p_new text) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_row private.app_pins;
begin
  select * into v_row from private.app_pins where user_id = v_user for update;
  if v_row.user_id is null then
    return 'none';
  end if;
  if v_row.failed >= 5 then
    return 'locked';
  end if;
  if not (coalesce(p_old, '') ~ '^[0-9]{6}$' and extensions.crypt(p_old, v_row.pin_hash) = v_row.pin_hash) then
    update private.app_pins set failed = failed + 1 where user_id = v_user;
    return case when v_row.failed + 1 >= 5 then 'locked' else 'wrong' end;
  end if;
  if private.pin_is_weak(p_new) then
    return 'weak';
  end if;
  update private.app_pins set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 8)), failed = 0, updated_at = now() where user_id = v_user;
  perform private.audit('pin.changed', 'profiles', v_user::text, null, null);
  return 'ok';
end;
$$;
revoke all on function public.change_app_pin(text, text) from public, anon;
grant execute on function public.change_app_pin(text, text) to authenticated;

-- The app lock (same device): unchanged rules, and the unlock shares the account lockout.
-- check_app_pin from 20261124160000 stays as it is.

-- After five wrong PINs, the next email-code sign-in must set a new PIN.
create function public.my_pin_locked() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select failed >= 5 from private.app_pins where user_id = (select auth.uid())), false);
$$;
create function public.my_pin_tries_left() returns int language sql stable security definer set search_path = '' as $$
  select greatest(0, 5 - coalesce((select failed from private.app_pins where user_id = (select auth.uid())), 0));
$$;
revoke all on function public.my_pin_tries_left() from public, anon;
grant execute on function public.my_pin_tries_left() to authenticated;
revoke all on function public.my_pin_locked() from public, anon;
grant execute on function public.my_pin_locked() to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Known devices and wrong PINs per internet address.
-- ---------------------------------------------------------------------------------------------------
create table private.known_devices (
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  label text not null default '' check (char_length(label) <= 80),
  city text not null default '' check (char_length(city) <= 80),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, device_hash)
);

create table private.pin_attempts (
  id bigint generated always as identity primary key,
  ip_key text not null check (char_length(ip_key) between 1 and 128),
  at timestamptz not null default now()
);
create index pin_attempts_ip_at on private.pin_attempts (ip_key, at);

-- Wrong PINs from one internet address in the last 15 minutes (2 or more asks for the bot check).
create function public.pin_ip_failures(p_ip_key text) returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from private.pin_attempts where ip_key = p_ip_key and at > now() - interval '15 minutes';
$$;

-- Who a sign-in name belongs to: an email, or a Nigerian phone number in E.164 without the plus
-- (2348031234567). Never says whether an account exists to the browser; the server action decides.
create function private.user_for_login(p_login text) returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where (position('@' in coalesce(p_login, '')) > 0 and lower(u.email) = lower(btrim(p_login)))
     or (p_login ~ '^234[0-9]{10}$' and u.phone = p_login)
  limit 1;
$$;
revoke all on function private.user_for_login(text) from public;

-- New-device sign-in with email (or phone) and PIN. Statuses:
--   ok        right PIN; user_id and email are returned so the server can create the session
--   wrong     wrong PIN; left = tries before the lock
--   locked    five wrong PINs; just_locked = this try locked it (the server emails the person)
--   none      no such account, or it has no PIN yet (sign in with an email code)
--   limited   too many wrong PINs from this internet address
create function public.pin_sign_in(p_login text, p_pin text, p_ip_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_row private.app_pins;
  v_email text;
begin
  if (select count(*) from private.pin_attempts where ip_key = p_ip_key and at > now() - interval '15 minutes') >= 20 then
    return jsonb_build_object('status', 'limited');
  end if;
  v_user := private.user_for_login(p_login);
  if v_user is null then
    insert into private.pin_attempts (ip_key) values (p_ip_key);
    return jsonb_build_object('status', 'none');
  end if;
  select * into v_row from private.app_pins where user_id = v_user for update;
  if v_row.user_id is null then
    return jsonb_build_object('status', 'none');
  end if;
  if v_row.failed >= 5 then
    return jsonb_build_object('status', 'locked', 'just_locked', false, 'user_id', v_user);
  end if;
  if coalesce(p_pin, '') ~ '^[0-9]{6}$' and extensions.crypt(p_pin, v_row.pin_hash) = v_row.pin_hash then
    update private.app_pins set failed = 0 where user_id = v_user;
    select email into v_email from auth.users where id = v_user;
    return jsonb_build_object('status', 'ok', 'user_id', v_user, 'email', v_email);
  end if;
  update private.app_pins set failed = failed + 1 where user_id = v_user;
  insert into private.pin_attempts (ip_key) values (p_ip_key);
  if v_row.failed + 1 >= 5 then
    perform private.audit('pin.locked', 'profiles', v_user::text, null, jsonb_build_object('via', 'sign_in'));
    return jsonb_build_object('status', 'locked', 'just_locked', true, 'user_id', v_user);
  end if;
  return jsonb_build_object('status', 'wrong', 'left', 5 - (v_row.failed + 1));
end;
$$;

-- A signed-in device. Returns true when it is new for an account that had signed in before
-- (the very first sign-up is not a "new sign-in" worth an email).
create function public.record_device(p_user uuid, p_device_hash text, p_label text, p_city text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_had_any boolean;
  v_new boolean;
begin
  select exists (select 1 from private.known_devices where user_id = p_user) into v_had_any;
  insert into private.known_devices (user_id, device_hash, label, city)
  values (p_user, p_device_hash, left(coalesce(p_label, ''), 80), left(coalesce(p_city, ''), 80))
  on conflict (user_id, device_hash) do update set last_seen = now(), label = excluded.label, city = excluded.city
  returning (xmax = 0) into v_new;
  return v_new and v_had_any;
end;
$$;

-- "Not you? Lock your account": the PIN is removed and every device is signed out. The person signs
-- in with an email code and sets a new PIN (set_app_pin needs no fresh check when there is no PIN).
create function public.lock_account(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.app_pins where user_id = p_user;
  delete from private.known_devices where user_id = p_user;
  delete from auth.sessions where user_id = p_user;
  perform private.audit('account.locked', 'profiles', p_user::text, null, jsonb_build_object('via', 'email_link'));
end;
$$;

-- Phone-only accounts carry an internal address (p-…@phone.freight-africa.com) only so the server can
-- open their session; their profile never gets it, so it is never shown or mailed.
create or replace function private.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.insert_profile(new.id, case when lower(new.email) like '%@phone.freight-africa.com' then null else new.email end, new.phone, new.raw_user_meta_data);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- People invited by phone (no email). The owner's invite link is the first proof; later a forgotten
-- PIN is reset only through a new PIN link from their owner or an admin.
-- ---------------------------------------------------------------------------------------------------
create table private.pin_reset_links (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz
);

-- An owner or admin (manage_drivers or manage_team in that business) makes a link for a member whose
-- account has no email of their own (the internal phone address). Returns nothing; the server keeps
-- the token and shows the link once.
create function public.create_pin_reset_link(p_org uuid, p_member uuid, p_token_hash text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not (public.can_in_org(p_org, 'manage_drivers') or public.can_in_org(p_org, 'manage_team')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organization_members where org_id = p_org and user_id = p_member and status = 'active') then
    raise exception 'not a member' using errcode = '42501';
  end if;
  if p_member = v_user then
    raise exception 'not for yourself' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_member and email like 'p-%@phone.freight-africa.com') then
    raise exception 'only for people invited by phone' using errcode = '42501';
  end if;
  update private.pin_reset_links set used_at = now() where user_id = p_member and used_at is null;
  insert into private.pin_reset_links (token_hash, user_id, org_id, created_by) values (p_token_hash, p_member, p_org, v_user);
  perform private.audit('pin.reset_link', 'profiles', p_member::text, null, jsonb_build_object('org', p_org));
end;
$$;

-- Server only: spends a reset link once; returns the account's id and internal address, or nothing.
create function public.use_pin_reset_link(p_token_hash text) returns table (user_id uuid, email text, full_name text)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  update private.pin_reset_links l set used_at = now()
  where l.token_hash = p_token_hash and l.used_at is null and l.expires_at > now()
    and exists (select 1 from public.organization_members m where m.org_id = l.org_id and m.user_id = l.user_id and m.status = 'active')
  returning l.user_id into v_user;
  if v_user is null then
    return;
  end if;
  -- The old PIN goes; set_app_pin then needs no fresh check, and the lockout is cleared.
  delete from private.app_pins where app_pins.user_id = v_user;
  return query select u.id, u.email::text, p.full_name from auth.users u join public.profiles p on p.id = u.id where u.id = v_user;
end;
$$;

-- Server only: whether a phone number (2348031234567) already has an account.
create function public.pin_sign_in_phone_taken(p_phone text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where phone = p_phone);
$$;

-- Server only: who a reset link is for, without spending it (the page shows their name).
create function public.peek_pin_reset_link(p_token_hash text) returns text
language sql stable security definer set search_path = '' as $$
  select p.full_name from private.pin_reset_links l join public.profiles p on p.id = l.user_id
  where l.token_hash = p_token_hash and l.used_at is null and l.expires_at > now();
$$;

-- Server only: a phone invite is accepted by the person opening the link the owner shared. Returns the
-- invite's phone (+2348031234567), business and role, if the link is open and was sent to a phone.
create function public.peek_phone_invite(p_token text) returns table (phone text, org_name text, role text)
language sql stable security definer set search_path = '' as $$
  select i.phone, o.name, coalesce(i.role_payload ->> 'shipper_role', i.role_payload ->> 'transporter_role')
  from public.invites i join public.organizations o on o.id = i.org_id
  where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now() and i.phone is not null and i.email is null;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Optional two-step sign-in for everyone (staff keep theirs): backup codes like the staff ones.
-- ---------------------------------------------------------------------------------------------------
create table private.backup_codes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, code_hash)
);
create table private.backup_code_tries (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index backup_code_tries_user_at on private.backup_code_tries (user_id, at desc);

-- New codes need a two-step session (aal2): the first set comes right after the authenticator is confirmed.
create function public.new_backup_codes() returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_codes text[] := '{}';
  v_code text;
  i int;
begin
  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'two-step sign-in needed' using errcode = '42501';
  end if;
  delete from private.backup_codes where user_id = v_user;
  for i in 1..10 loop
    v_code := (
      select string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + (get_byte(b, n) % 31), 1), '' order by n)
      from (select extensions.gen_random_bytes(16) as b) r, generate_series(0, 15) as n
    );
    insert into private.backup_codes (user_id, code_hash) values (v_user, encode(extensions.digest(v_code, 'sha256'), 'hex'));
    v_codes := v_codes || (substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4) || '-' || substr(v_code, 13, 4));
  end loop;
  return v_codes;
end;
$$;

-- Lost authenticator: spends one code (five wrong tries an hour lock it). True if good; the server then
-- removes the authenticator so the person can sign in and set up a new one.
create function public.use_backup_code(p_code text) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_hash text := encode(extensions.digest(upper(replace(btrim(coalesce(p_code, '')), '-', '')), 'sha256'), 'hex');
begin
  if (select count(*) from private.backup_code_tries where user_id = v_user and at > now() - interval '1 hour') >= 5 then
    raise exception 'too many tries' using errcode = '54000';
  end if;
  update private.backup_codes set used_at = now() where user_id = v_user and code_hash = v_hash and used_at is null;
  if found then
    perform private.audit('backup_code.used', 'profiles', v_user::text, null, null);
    return true;
  end if;
  insert into private.backup_code_tries (user_id) values (v_user);
  return false;
end;
$$;
revoke all on function public.new_backup_codes() from public, anon;
grant execute on function public.new_backup_codes() to authenticated;
revoke all on function public.use_backup_code(text) from public, anon;
grant execute on function public.use_backup_code(text) to authenticated;

-- The demo accounts' PIN (scripts/seed-demo.mjs, D039). Service role only, demo accounts only; the PIN
-- itself comes from the founder's git-ignored .env.founder.local and is never in the repository.
create function public.seed_demo_pin(p_user uuid, p_pin text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = p_user and is_demo) then
    raise exception 'demo accounts only' using errcode = '42501';
  end if;
  if private.pin_is_weak(p_pin) then
    raise exception 'choose a PIN that is harder to guess' using errcode = '22023';
  end if;
  insert into private.app_pins (user_id, pin_hash, failed, updated_at)
  values (p_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), 0, now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, updated_at = now();
end;
$$;
revoke all on function public.seed_demo_pin(uuid, text) from public, anon, authenticated;
grant execute on function public.seed_demo_pin(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Setting: how long the app stays open without use.
-- ---------------------------------------------------------------------------------------------------
insert into public.settings (key, value, is_money, description) values
  ('app_lock_minutes', '15', false, 'Minutes the app can be closed or unused before the PIN is asked again (D044).')
on conflict (key) do nothing;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.pin_ip_failures(text)',
    'public.pin_sign_in(text, text, text)',
    'public.record_device(uuid, text, text, text)',
    'public.lock_account(uuid)',
    'public.use_pin_reset_link(text)',
    'public.peek_pin_reset_link(text)',
    'public.peek_phone_invite(text)',
    'public.pin_sign_in_phone_taken(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  execute 'revoke all on function public.create_pin_reset_link(uuid, uuid, text) from public, anon';
  execute 'grant execute on function public.create_pin_reset_link(uuid, uuid, text) to authenticated';
end;
$$;
