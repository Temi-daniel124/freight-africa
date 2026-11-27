-- Independent review of #93 (27 Nov 2026): set_app_pin is callable from the browser, and its only guard
-- is a sign-in in the last 15 minutes. Anyone holding a fresh session (the session cookie is readable by
-- page scripts) could replace a PIN and clear its lockout without the app's own checks (a just-confirmed
-- email code for Choose a PIN, a one-time token for a reset link or a phone invite).
--
-- Step 1 (this migration): set_app_pin_for, callable only with the service key, for our server actions,
-- which make those checks first. Step 2 (the next migration, after the server actions use it): the
-- browser loses set_app_pin.

create function public.set_app_pin_for(p_user uuid, p_pin text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'no such person' using errcode = 'P0002';
  end if;
  if private.pin_is_weak(p_pin) then
    raise exception 'choose a PIN that is harder to guess' using errcode = '22023';
  end if;
  insert into private.app_pins (user_id, pin_hash, failed, updated_at)
  values (p_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)), 0, now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, updated_at = now();
end;
$$;

revoke all on function public.set_app_pin_for(uuid, text) from public, anon, authenticated;
grant execute on function public.set_app_pin_for(uuid, text) to service_role;
