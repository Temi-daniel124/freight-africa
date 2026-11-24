-- What a new person said they're joining as at A-03, so /app opens that role's shell before any
-- organisation exists (ux-public-and-auth.md A-03; founder, 24 Nov 2026). Owner-drivers are owners who
-- drive (D003); they choose that inside the owner setup. Nothing is granted by this value: rights
-- still come only from organisation membership (ROLES-AND-PERMISSIONS §6).

alter table public.profiles add column joining_as text
  check (joining_as is null or joining_as in ('shipper', 'owner', 'owner_driver', 'agent'));

grant update (joining_as) on public.profiles to authenticated;
