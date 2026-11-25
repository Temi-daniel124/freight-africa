-- Our own lock for wrong authenticator codes (security gap closed, D044 / SECURITY §3, admin X00j).
-- Five wrong codes in a row, at sign-in or in a fresh check, lock two-step sign-in for the account.
-- The lock stays until the person confirms an email code at sign-in; a correct authenticator code
-- can't clear it, because none is checked while it is locked. The tries reuse private.fresh_tries:
-- a try is written before the code is checked and every try is cleared when a code passes, so the
-- tries left are the wrong ones, in a row.

create table private.two_step_locks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  locked_at timestamptz not null default now()
);
revoke all on private.two_step_locks from public, anon, authenticated;

-- Server only: before an authenticator code is checked. False when locked (or this would be a sixth).
create or replace function public.fresh_try(p_user uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  -- One try at a time per person, so tries sent together can't all slip past the limit (review).
  perform pg_advisory_xact_lock(hashtextextended('fresh_try:' || p_user::text, 0));
  if exists (select 1 from private.two_step_locks where user_id = p_user) then
    return false;
  end if;
  if (select count(*) from private.fresh_tries where user_id = p_user) >= 5 then
    insert into private.two_step_locks (user_id) values (p_user) on conflict (user_id) do nothing;
    return false;
  end if;
  insert into private.fresh_tries (user_id) values (p_user);
  return true;
end;
$$;

-- Server only: the code just checked was wrong. True only for the wrong code that locks it, so the
-- server sends the alert email once.
create function public.fresh_wrong(p_user uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('fresh_try:' || p_user::text, 0));
  if exists (select 1 from private.two_step_locks where user_id = p_user) then
    return false;
  end if;
  if (select count(*) from private.fresh_tries where user_id = p_user) < 5 then
    return false;
  end if;
  insert into private.two_step_locks (user_id) values (p_user);
  perform private.audit('two_step.locked', 'profiles', p_user::text, null, null);
  return true;
end;
$$;

-- Server only: a code check that never happened (the auth service failed) gives its try back.
create function public.fresh_refund(p_user uuid) returns void language sql security definer set search_path = '' as $$
  delete from private.fresh_tries
  where ctid = (select ctid from private.fresh_tries where user_id = p_user order by at desc limit 1);
$$;

-- Server only: is two-step sign-in locked for this person?
create function public.two_step_locked(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.two_step_locks where user_id = p_user);
$$;

-- Server only: the person confirmed an email code at sign-in. Clears the lock and the wrong tries.
create function public.clear_two_step_lock(p_user uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from private.fresh_tries where user_id = p_user;
  delete from private.two_step_locks where user_id = p_user;
  if found then
    perform private.audit('two_step.unlocked', 'profiles', p_user::text, null, null);
  end if;
end;
$$;

-- A correct authenticator code clears the wrong tries, but never a lock (only an email code does).
create or replace function public.record_fresh_check(p_user uuid, p_session uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from private.two_step_locks where user_id = p_user) then
    raise exception 'two-step sign-in is locked' using errcode = '28000';
  end if;
  insert into private.fresh_checks (session_id, user_id) values (p_session, p_user)
  on conflict (session_id) do update set at = now(), user_id = excluded.user_id;
  delete from private.fresh_tries where user_id = p_user;
end;
$$;

revoke all on function public.fresh_try(uuid) from public, anon, authenticated;
revoke all on function public.fresh_wrong(uuid) from public, anon, authenticated;
revoke all on function public.fresh_refund(uuid) from public, anon, authenticated;
revoke all on function public.two_step_locked(uuid) from public, anon, authenticated;
revoke all on function public.clear_two_step_lock(uuid) from public, anon, authenticated;
revoke all on function public.record_fresh_check(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fresh_try(uuid) to service_role;
grant execute on function public.fresh_wrong(uuid) to service_role;
grant execute on function public.fresh_refund(uuid) to service_role;
grant execute on function public.two_step_locked(uuid) to service_role;
grant execute on function public.clear_two_step_lock(uuid) to service_role;
grant execute on function public.record_fresh_check(uuid, uuid) to service_role;
