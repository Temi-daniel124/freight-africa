-- Sign-in code limits (SYSTEM-LOGIC.md section 10: "Sign-in codes 5 per hour per number"; A-02: "After 5
-- wrong tries: Too many tries. Get a new code."). Supabase Auth sends and checks the codes; these functions
-- only count. Callers pass an HMAC of the phone or email, never the value itself.
-- The limits (5 sends an hour, 5 tries a code) move to the settings table (code_max_attempts) in the
-- settings slice of Phase 1.

create table private.auth_code_attempts (
  key text primary key check (char_length(key) between 16 and 128),
  failures integer not null default 0 check (failures >= 0),
  sent_at timestamptz not null default now()
);
alter table private.auth_code_attempts enable row level security;
revoke all on private.auth_code_attempts from public, anon, authenticated, service_role;

-- Call before asking Supabase for a code. False when this person has had 5 codes in the hour, or when one
-- internet address (p_ip_key, a keyed hash) has asked for 20: that stops one visitor sending codes to many
-- different people. A new code starts a fresh count of wrong tries.
create function public.auth_code_sending(p_key text, p_ip_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.hit_rate_limit('auth:ip:' || p_ip_key, 20, interval '1 hour')
    or not private.hit_rate_limit('auth:send:' || p_key, 5, interval '1 hour') then
    return false;
  end if;
  insert into private.auth_code_attempts (key, failures, sent_at)
  values (p_key, 0, now())
  on conflict (key) do update set failures = 0, sent_at = now();
  return true;
end;
$$;

-- Call before checking a code. False after 5 wrong tries on the current code.
create function public.auth_code_open(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select failures < 5 from private.auth_code_attempts where key = p_key), true);
$$;

-- Call after a wrong code. Returns the number of tries left (0 means "get a new code").
create function public.auth_code_failed(p_key text)
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
  returning failures into v_failures;
  return greatest(5 - v_failures, 0);
end;
$$;

-- Call after a right code: the count is no longer needed.
create function public.auth_code_passed(p_key text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.auth_code_attempts where key = p_key;
$$;

revoke all on function public.auth_code_sending(text, text) from public, anon, authenticated;
revoke all on function public.auth_code_open(text) from public, anon, authenticated;
revoke all on function public.auth_code_failed(text) from public, anon, authenticated;
revoke all on function public.auth_code_passed(text) from public, anon, authenticated;
grant execute on function public.auth_code_sending(text, text) to service_role;
grant execute on function public.auth_code_open(text) to service_role;
grant execute on function public.auth_code_failed(text) to service_role;
grant execute on function public.auth_code_passed(text) to service_role;
