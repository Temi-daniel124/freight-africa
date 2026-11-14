-- Pre-launch waitlist (BUILD.md section 2A, D030). Only server code using the secret key touches it,
-- through public.join_waitlist(); anon and authenticated can't read or write anything.

-- A fixed-window rate limiter, reused by later phases (Phase 1 sign-in codes).
create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_start_idx on private.rate_limits (window_start);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated, service_role;

-- Counts one hit for p_key in the current window; true while the key is within p_limit.
create function private.hit_rate_limit(p_key text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seconds double precision := extract(epoch from p_window);
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);
  v_hits integer;
begin
  delete from private.rate_limits where window_start < now() - interval '1 day';
  insert into private.rate_limits (key, window_start, hits)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke all on function private.hit_rate_limit(text, integer, interval) from public, anon, authenticated, service_role;

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text not null check (phone ~ '^\+234[789][01][0-9]{8}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  role text not null check (role in ('shipper', 'owner', 'agent')),
  corridor_interest text[] not null default '{}'
    check (corridor_interest <@ array['lagos-kano', 'lagos-abuja', 'lagos-onitsha-aba', 'eastern-loop']::text[]),
  trucks_count integer check (trucks_count between 1 and 1000),
  source text not null default 'website' check (char_length(source) between 1 and 64),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  invited_at timestamptz,
  constraint waitlist_trucks_only_for_owners check (trucks_count is null or role = 'owner')
);

-- Phones are stored normalised (+234XXXXXXXXXX), so one person signs up once.
create unique index waitlist_signups_phone_key on public.waitlist_signups (phone);

alter table public.waitlist_signups enable row level security;
-- No policies on purpose: anon and authenticated get nothing (BUILD.md section 2A).
revoke all on public.waitlist_signups from public, anon, authenticated;
-- The export script reads with the secret key; the founder uses the table editor.
grant select, update on public.waitlist_signups to service_role;

-- Records a sign-up. Returns 'joined', 'duplicate' (phone already on the list) or 'rate_limited'.
-- p_ip_key is a hash of the caller's IP address, never the address itself.
create function public.join_waitlist(
  p_name text,
  p_phone text,
  p_email text,
  p_role text,
  p_corridors text[],
  p_trucks integer,
  p_source text,
  p_ip_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.hit_rate_limit('waitlist:ip:' || p_ip_key, 5, interval '1 hour')
    or not private.hit_rate_limit('waitlist:phone:' || p_phone, 3, interval '1 hour') then
    return 'rate_limited';
  end if;

  insert into public.waitlist_signups (name, phone, email, role, corridor_interest, trucks_count, source, consent_at)
  values (
    btrim(p_name),
    p_phone,
    nullif(lower(btrim(p_email)), ''),
    p_role,
    coalesce(p_corridors, '{}'),
    p_trucks,
    coalesce(nullif(btrim(p_source), ''), 'website'),
    now()
  )
  on conflict (phone) do nothing;

  if not found then
    return 'duplicate';
  end if;
  return 'joined';
end;
$$;
revoke all on function public.join_waitlist(text, text, text, text, text[], integer, text, text) from public, anon, authenticated;
grant execute on function public.join_waitlist(text, text, text, text, text[], integer, text, text) to service_role;
