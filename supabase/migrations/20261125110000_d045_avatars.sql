-- D045: a person's picture is one of the 3D faces (public/avatars/face-01 … face-12). Only the key is
-- stored; we never ask for or store gender. Until they choose, the app shows their initials.
alter table public.profiles add column avatar_key text check (avatar_key is null or avatar_key ~ '^face-(0[1-9]|1[0-2])$');
grant update (avatar_key) on public.profiles to authenticated;
