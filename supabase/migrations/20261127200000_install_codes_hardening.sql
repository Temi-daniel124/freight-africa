-- Review of #120: locking the account (or a new PIN) ends a live setup code; a code needs a PIN; active
-- accounts only; at most 20 tries from one internet address in 15 minutes; purges use an index.

create index install_redeem_attempts_created on private.install_redeem_attempts (created_at);
create table private.install_redeem_ips (
  ip_key text not null,
  created_at timestamptz not null default now()
);
create index install_redeem_ips_key on private.install_redeem_ips (ip_key, created_at);
create index install_redeem_ips_created on private.install_redeem_ips (created_at);

create function private.end_install_code() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from private.install_codes where user_id = old.user_id;
  return null;
end;
$$;
create trigger app_pins_end_install_code after delete or update of pin_hash on private.app_pins
  for each row execute function private.end_install_code();

drop function public.redeem_install_code(text, text);

create function public.redeem_install_code(p_phone text, p_code text, p_ip_key text) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_row private.install_codes;
  -- Every path does one bcrypt, so the time taken doesn't say which numbers have a live code (review).
  v_dummy constant text := '$2a$08$0123456789012345678901uJ6yq7Lq3fYc6QFz9i0m6kz2V7pJ6W1u';
  v_well_formed boolean := coalesce(p_code, '') ~ '^[0-9]{6}$';
begin
  -- Only real phone numbers are counted (nobody can fill the table with junk; review).
  if coalesce(p_phone, '') !~ '^\+[1-9][0-9]{7,14}$' then
    perform extensions.crypt(coalesce(p_code, ''), v_dummy);
    return null;
  end if;
  -- At most 10 tries for a number in 15 minutes, whoever makes them (the server also limits by address).
  -- The owner making a new code clears them, so nobody can keep the owner locked out (review).
  -- At most 20 tries from one internet address in 15 minutes (review of #120).
  if (select count(*) from private.install_redeem_ips where ip_key = coalesce(p_ip_key, '') and created_at > now() - interval '15 minutes') >= 20 then
    perform extensions.crypt(coalesce(p_code, ''), v_dummy);
    return null;
  end if;
  insert into private.install_redeem_ips (ip_key) values (coalesce(p_ip_key, ''));
  delete from private.install_redeem_ips where created_at < now() - interval '1 hour';
  perform pg_advisory_xact_lock(hashtext('install-redeem:' || p_phone));
  delete from private.install_redeem_attempts where created_at < now() - interval '1 hour';
  if (select count(*) from private.install_redeem_attempts where phone = coalesce(p_phone, '') and created_at > now() - interval '15 minutes') >= 10 then
    perform extensions.crypt(coalesce(p_code, ''), v_dummy);
    return null;
  end if;
  insert into private.install_redeem_attempts (phone) values (coalesce(p_phone, ''));
  select id into v_user from public.profiles where phone = p_phone and deleted_at is null and status = 'active';
  if v_user is not null then
    select * into v_row from private.install_codes where user_id = v_user for update;
  end if;
  -- A code only works for someone with a PIN: locking the account removes the PIN, and so the code (review).
  if v_user is null or v_row.user_id is null or not exists (select 1 from private.app_pins where user_id = v_user) or v_row.expires_at < now() or v_row.tries >= 5 then
    perform extensions.crypt(coalesce(p_code, ''), v_dummy);
    return null;
  end if;
  -- A missing or malformed code is a wrong code (crypt of NULL is NULL, which would otherwise pass; review).
  if extensions.crypt(case when v_well_formed then p_code else '' end, v_row.code_hash) is distinct from v_row.code_hash or not v_well_formed then
    update private.install_codes set tries = tries + 1 where user_id = v_user;
    return null;
  end if;
  delete from private.install_codes where user_id = v_user;
  delete from private.install_redeem_attempts where phone = p_phone;
  return v_user;
end;
$$;

revoke all on function public.redeem_install_code(text, text, text) from public, anon, authenticated;
grant execute on function public.redeem_install_code(text, text, text) to service_role;
