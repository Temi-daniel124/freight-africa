-- Combined brief slice 6 (owner v1.1) and 7 (driver DV32b/DV32c): messages from drivers (D051).
-- A driver messages their own business with a reason and text or a voice note; the owner and owner
-- Admins read and reply; the reply reaches the driver's Notifications. Not live chat; never a phone
-- number; SOS never goes through here. Writes go through functions only.

create type public.driver_message_reason as enum ('repair', 'day_off', 'papers', 'other');

create table public.driver_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  truck_id uuid references public.trucks (id) on delete set null,
  reason public.driver_message_reason not null,
  body text check (body is null or char_length(btrim(body)) between 1 and 1000),
  -- A voice note in the private "driver-voice" storage bucket: <org>/<driver>/<uuid>.webm
  voice_path text check (voice_path is null or voice_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|ogg|m4a|mp3)$'),
  voice_seconds int check (voice_seconds is null or voice_seconds between 1 and 180),
  read_at timestamptz,
  reply text check (reply is null or char_length(btrim(reply)) between 1 and 1000),
  replied_by uuid references public.profiles (id) on delete set null,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or voice_path is not null),
  check ((reply is null) = (replied_at is null))
);
create index driver_messages_org on public.driver_messages (org_id, created_at desc);
create index driver_messages_driver on public.driver_messages (driver_id, created_at desc);

alter table public.driver_messages enable row level security;
create policy "driver messages: the driver" on public.driver_messages for select to authenticated using (driver_id = (select auth.uid()));
create policy "driver messages: owner and admins" on public.driver_messages for select to authenticated using ((select public.can_in_org(org_id, 'manage_drivers')));
revoke all on public.driver_messages from anon, authenticated;
grant select on public.driver_messages to authenticated;
grant select, insert, update, delete on public.driver_messages to service_role;

-- DV32c: the driver sends. Only an active driver of that business, at most 20 a day (no flooding).
create function public.send_driver_message(p_org uuid, p_reason public.driver_message_reason, p_body text default null,
  p_voice_path text default null, p_voice_seconds int default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_driver public.drivers;
  v_id uuid;
  v_owner record;
begin
  select * into v_driver from public.drivers where user_id = v_user and org_id = p_org;
  -- Only an approved, active driver of a business that isn't banned (review); a paused driver may still
  -- say why they're paused.
  if v_driver.user_id is null or v_driver.status <> 'active'
    or not exists (select 1 from public.organization_members where org_id = p_org and user_id = v_user and status = 'active')
    or exists (select 1 from public.organizations where id = p_org and status = 'banned') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if nullif(btrim(p_body), '') is null and p_voice_path is null then
    raise exception 'write a message or record a voice note' using errcode = '22023';
  end if;
  if p_voice_path is null then
    p_voice_seconds := null;
  elsif split_part(p_voice_path, '/', 1) <> p_org::text or split_part(p_voice_path, '/', 2) <> v_user::text then
    raise exception 'that voice note isn''t yours' using errcode = '42501';
  elsif not exists (select 1 from storage.objects where bucket_id = 'driver-voice' and name = p_voice_path) then
    raise exception 'that voice note didn''t upload; record it again' using errcode = '22023';
  end if;
  -- One send at a time per driver, so the daily limit can't be raced past (review).
  perform pg_advisory_xact_lock(hashtext('driver-message:' || v_user::text));
  if (select count(*) from public.driver_messages where driver_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too many messages today' using errcode = '22023';
  end if;
  insert into public.driver_messages (org_id, driver_id, truck_id, reason, body, voice_path, voice_seconds)
  values (p_org, v_user, v_driver.default_truck_id, p_reason, nullif(btrim(p_body), ''), p_voice_path, p_voice_seconds)
  returning id into v_id;
  -- The owner and Admins hear about it in the app and by push (never WhatsApp while it is off).
  for v_owner in select m.user_id from public.organization_members m
    where m.org_id = p_org and m.status = 'active' and m.transporter_role in ('owner', 'manager') and m.user_id <> v_user loop
    perform private.notify('fleet.driver_message', 'driver_message', array['in_app', 'push']::public.notify_channel[],
      jsonb_build_object('message', v_id, 'reason', p_reason), v_owner.user_id, null, null, 'driver-message:' || v_id || ':' || v_owner.user_id);
  end loop;
  return v_id;
end;
$$;

-- O19e: the owner or an Admin replies (text). The reply goes to the driver's Notifications.
create function public.reply_driver_message(p_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_msg public.driver_messages;
begin
  select * into v_msg from public.driver_messages where id = p_id for update;
  if v_msg.id is null or not public.can_in_org(v_msg.org_id, 'manage_drivers') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_reply is null or char_length(btrim(p_reply)) not between 1 and 1000 then
    raise exception 'write a reply' using errcode = '22023';
  end if;
  update public.driver_messages set reply = btrim(p_reply), replied_by = v_user, replied_at = now(), read_at = coalesce(read_at, now()) where id = p_id;
  perform private.notify('fleet.owner_reply', 'owner_reply', array['in_app', 'push']::public.notify_channel[],
    -- The id only: the reply's words stay in the app, not on a lock screen (review).
    jsonb_build_object('message', p_id), v_msg.driver_id, null, null, 'owner-reply:' || p_id || ':' || gen_random_uuid());
end;
$$;

create function public.read_driver_message(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not exists (select 1 from public.driver_messages where id = p_id and public.can_in_org(org_id, 'manage_drivers')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.driver_messages set read_at = now() where id = p_id and read_at is null;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.send_driver_message(uuid, public.driver_message_reason, text, text, int)',
    'public.reply_driver_message(uuid, text)',
    'public.read_driver_message(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Voice notes: a private bucket; the driver uploads into their own folder, the owner side reads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-voice', 'driver-voice', false, 2097152, array['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;
create policy "driver voice: the driver uploads to their folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'driver-voice' and (storage.foldername(name))[2] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|ogg|m4a|mp3)$'
    and exists (select 1 from public.drivers d join public.organization_members m on m.org_id = d.org_id and m.user_id = d.user_id and m.status = 'active'
      where d.user_id = (select auth.uid()) and d.status = 'active' and d.org_id::text = (storage.foldername(name))[1]));
create policy "driver voice: the driver and the owner side read" on storage.objects for select to authenticated
  using (bucket_id = 'driver-voice' and ((storage.foldername(name))[2] = (select auth.uid())::text
    or (select public.can_in_org(private.folder_org(name), 'manage_drivers'))));
