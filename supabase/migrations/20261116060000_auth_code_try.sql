-- Sign-in codes, review follow-up (Nov 2026).
-- 1. Counting a try used to be "read the count, check the code, then add one", so several guesses sent
--    at the same moment could all pass the read. auth_code_try counts first, in one statement.
-- 2. One internet address may now ask for 60 codes an hour, not 20: Nigerian mobile networks put many
--    people behind one address, and 20 could block honest sign-ins. The per-person limit stays at 5.
-- auth_code_open and auth_code_failed are no longer called once the app uses auth_code_try; they are
-- left in place for the release that still calls them and removed in a later migration.

-- Counts one try against the current code. Returns how many tries are left after this one (4 down to 0),
-- or -1 when there were none left, in which case the code must not be checked at all.
create function public.auth_code_try(p_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failures integer;
begin
  insert into private.auth_code_attempts (key, failures)
  values (p_key, 1)
  on conflict (key) do update set failures = private.auth_code_attempts.failures + 1
    where private.auth_code_attempts.failures < 5
  returning failures into v_failures;
  if not found then
    return -1;
  end if;
  return 5 - v_failures;
end;
$$;

-- Gives a try back when the check could not be made (the auth service was down or busy), so an outage
-- never uses up someone's tries.
create function public.auth_code_refund(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.auth_code_attempts set failures = greatest(failures - 1, 0) where key = p_key;
$$;

create or replace function public.auth_code_sending(p_key text, p_ip_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.hit_rate_limit('auth:ip:' || p_ip_key, 60, interval '1 hour')
    or not private.hit_rate_limit('auth:send:' || p_key, 5, interval '1 hour') then
    return false;
  end if;
  insert into private.auth_code_attempts (key, failures, sent_at)
  values (p_key, 0, now())
  on conflict (key) do update set failures = 0, sent_at = now();
  return true;
end;
$$;

revoke all on function public.auth_code_try(text) from public, anon, authenticated;
revoke all on function public.auth_code_refund(text) from public, anon, authenticated;
grant execute on function public.auth_code_try(text) to service_role;
grant execute on function public.auth_code_refund(text) to service_role;
