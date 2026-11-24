-- Demo accounts (D039): every demo person and business is marked, so the cleanup before launch removes
-- them in one go (scripts/seed-demo.mjs --remove), and demo providers (payments, verification) work
-- only for them in production. Only the service role sets the mark; nobody can set it from the app.

alter table public.profiles add column is_demo boolean not null default false;
alter table public.organizations add column is_demo boolean not null default false;
create index profiles_demo on public.profiles (id) where is_demo;
create index organizations_demo on public.organizations (id) where is_demo;

-- Whether the signed-in person is a demo account (for the demo providers and the "Demo" badge).
create function public.am_i_demo() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_demo from public.profiles p where p.id = (select auth.uid())), false);
$$;
revoke all on function public.am_i_demo() from public;
grant execute on function public.am_i_demo() to authenticated;
