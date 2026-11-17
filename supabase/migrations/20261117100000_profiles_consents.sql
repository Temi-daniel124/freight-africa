-- Phase 1 slice 3: profiles and consents (DATA-MODEL.md §2; PLATFORM-SCOPE.md F-10; ux-public-and-auth.md A-03).

create type public.account_status as enum ('active', 'pending', 'suspended', 'banned');
create type public.kyc_status as enum ('not_started', 'in_progress', 'approved', 'declined', 'needs_review', 'expired');
create type public.language_code as enum ('en', 'pcm', 'ha', 'yo', 'ig');
create type public.consent_kind as enum ('terms', 'privacy', 'whatsapp', 'location', 'marketing');

-- One row per Supabase auth user. Phone and email are readable only by the person themselves (and staff,
-- once staff exist); other people get contact details only through trip_contacts() during a live trip (D018).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) between 1 and 120),
  phone text unique check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text unique check (email is null or char_length(email) <= 254),
  language public.language_code not null default 'en',
  avatar_path text,
  date_of_birth date,
  nin_last4 text check (nin_last4 is null or nin_last4 ~ '^[0-9]{4}$'),
  nin_enc bytea,
  kyc_status public.kyc_status not null default 'not_started',
  status public.account_status not null default 'active',
  last_active_org_id uuid,
  emergency_contact_name text check (emergency_contact_name is null or char_length(emergency_contact_name) <= 120),
  emergency_contact_phone text check (emergency_contact_phone is null or emergency_contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  night_look text not null default 'auto' check (night_look in ('auto', 'on', 'off')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.profiles to authenticated;
-- People may change only these; KYC fields, status and verified contacts are set by the server.
grant update (full_name, language, night_look, emergency_contact_name, emergency_contact_phone, last_active_org_id) on public.profiles to authenticated;
grant select, insert, update on public.profiles to service_role;

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();

-- Every new account gets its profile at once, with the address it signed in with.
create function private.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    nullif(lower(new.email), ''),
    case when coalesce(new.phone, '') = '' then null when new.phone like '+%' then new.phone else '+' || new.phone end,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_profile_for_user() from public;

create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile_for_user();

-- Accounts made before this migration.
insert into public.profiles (id, email, phone)
select u.id, nullif(lower(u.email), ''), case when coalesce(u.phone, '') = '' then null when u.phone like '+%' then u.phone else '+' || u.phone end
from auth.users u
on conflict (id) do nothing;

-- Consents (F-10): append-only. A change of mind is a new row; the latest row per kind is what counts.
-- ip_key is the keyed hash used for rate limits, never the address itself (privacy notice).
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.consent_kind not null,
  version text not null check (char_length(version) between 1 and 40),
  granted boolean not null,
  at timestamptz not null default now(),
  ip_key text check (ip_key is null or char_length(ip_key) <= 128),
  user_agent text check (user_agent is null or char_length(user_agent) <= 512)
);

create index consents_user_kind_at on public.consents (user_id, kind, at desc);

alter table public.consents enable row level security;

create policy "consents: read own" on public.consents for select to authenticated using (user_id = (select auth.uid()));

grant select on public.consents to authenticated;
grant select, insert on public.consents to service_role;

-- A-03: the four answers saved together. Terms, privacy and WhatsApp trip messages are required.
create function public.give_onboarding_consents(
  p_version text,
  p_marketing boolean,
  p_ip_key text default null,
  p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_user and deleted_at is null) then
    raise exception 'no profile' using errcode = 'P0002';
  end if;
  insert into public.consents (user_id, kind, version, granted, ip_key, user_agent)
  select v_user, kind, p_version, granted, p_ip_key, left(p_user_agent, 512)
  from (values ('terms'::public.consent_kind, true), ('privacy', true), ('whatsapp', true), ('marketing', coalesce(p_marketing, false))) as given (kind, granted);
end;
$$;

revoke all on function public.give_onboarding_consents(text, boolean, text, text) from public;
grant execute on function public.give_onboarding_consents(text, boolean, text, text) to authenticated;

-- True once the person has accepted the current terms (the role step is done).
create function public.has_accepted_terms(p_version text) returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.consents c
    where c.user_id = (select auth.uid()) and c.kind = 'terms' and c.version = p_version and c.granted
  );
$$;

revoke all on function public.has_accepted_terms(text) from public;
grant execute on function public.has_accepted_terms(text) to authenticated;
