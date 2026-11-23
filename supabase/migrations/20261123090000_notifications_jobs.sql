-- Phase 1 slice 8: tokens for tracking links, the notifications table and notify(), and the job dispatcher
-- (pg_cron + pg_net → POST /api/jobs/dispatch). DATA-MODEL.md §10 notifications, message_templates,
-- push_subscriptions, notification_preferences; ARCHITECTURE.md §2 and §3.4; SYSTEM-LOGIC.md §9 and §12.

-- ---------------------------------------------------------------------------------------------------
-- Link tokens (receiver and pickup tracking links, SECURITY.md §11): random, shown once in the link,
-- stored only as a SHA-256 hash on the stop (load_stops arrives in Phase 3).
-- ---------------------------------------------------------------------------------------------------

create function private.new_link_token() returns text language sql volatile set search_path = '' as $$
  select translate(rtrim(encode(extensions.gen_random_bytes(24), 'base64'), '='), '+/', '-_');
$$;

create function private.link_token_hash(p_token text) returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

revoke all on function private.new_link_token() from public;
revoke all on function private.link_token_hash(text) from public;

-- ---------------------------------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------------------------------

create type public.notify_channel as enum ('whatsapp', 'sms', 'email', 'push', 'in_app');
create type public.notify_status as enum ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped');

-- One body per event, channel and language (English only at launch, D017). WhatsApp bodies mirror the
-- approved Meta template named in meta_template_name.
create table public.message_templates (
  code text not null check (code ~ '^[a-z][a-z0-9_.]{1,79}$'),
  channel public.notify_channel not null,
  language public.language_code not null default 'en',
  subject text check (subject is null or char_length(subject) <= 200),
  body text not null check (char_length(body) between 1 and 4000),
  meta_template_name text,
  meta_category text check (meta_category is null or meta_category in ('utility', 'authentication')),
  meta_status text,
  variables text[] not null default '{}',
  primary key (code, channel, language)
);

alter table public.message_templates enable row level security;
create policy "message_templates: staff read" on public.message_templates for select to authenticated using ((select public.is_staff()));
grant select on public.message_templates to authenticated;
grant select, insert, update on public.message_templates to service_role;

-- The test message the dispatcher's acceptance check uses (BUILD.md Phase 1).
insert into public.message_templates (code, channel, subject, body, variables) values
  ('system.test', 'email', 'Freight Africa test message', 'This is a test from Freight Africa ({{reference}}). You can ignore it.', '{reference}'),
  ('system.test', 'in_app', null, 'Test message {{reference}}.', '{reference}');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- The event code from SYSTEM-LOGIC §9, e.g. 'load.funded'.
  event text not null check (event ~ '^[a-z][a-z0-9_.]{1,79}$'),
  user_id uuid references public.profiles (id) on delete set null,
  -- Receivers and pickup contacts have no account; they are reached by number or address only.
  to_phone text check (to_phone is null or to_phone ~ '^\+[1-9][0-9]{7,14}$'),
  to_email text check (to_email is null or char_length(to_email) <= 254),
  channel public.notify_channel not null,
  template_code text not null,
  language public.language_code not null default 'en',
  payload jsonb not null default '{}',
  status public.notify_status not null default 'queued',
  provider_message_id text,
  error text check (error is null or char_length(error) <= 300),
  fallback_of uuid references public.notifications (id),
  deliver_when_stopped boolean not null default false,
  trip_id uuid,
  load_id uuid,
  -- Delivery bookkeeping for the dispatcher.
  attempts int not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  -- notify() called twice for one event and person sends once.
  dedupe_key text unique check (dedupe_key is null or char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now(),
  constraint notification_has_recipient check (user_id is not null or to_phone is not null or to_email is not null)
);

create index notifications_queue on public.notifications (next_attempt_at) where status = 'queued';
create index notifications_user on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
-- People read their own in-app notifications (N-01); staff read all.
create policy "notifications: own in-app" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and channel = 'in_app');
create policy "notifications: staff read" on public.notifications for select to authenticated using ((select public.is_staff()));
grant select (id, event, user_id, channel, template_code, payload, status, trip_id, load_id, read_at, created_at) on public.notifications to authenticated;
grant select, insert, update on public.notifications to service_role;

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  event text not null,
  channel public.notify_channel not null,
  enabled boolean not null,
  primary key (user_id, event, channel)
);
alter table public.notification_preferences enable row level security;
create policy "notification_preferences: own" on public.notification_preferences for select to authenticated using (user_id = (select auth.uid()));
grant select on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notification_preferences to service_role;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: own" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
grant select on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

-- Events people can never switch off: safety, money and codes (SYSTEM-LOGIC §9).
create function private.is_locked_event(p_event text) returns boolean language sql immutable set search_path = '' as $$
  select p_event like 'safety.%' or p_event like 'money.%' or p_event like 'code.%' or p_event like 'system.%';
$$;

-- People turn events on or off per channel (A-10 Notifications); locked events stay on.
create function public.set_notification_preference(p_event text, p_channel public.notify_channel, p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if private.is_locked_event(p_event) then
    raise exception 'safety, money and code messages cannot be switched off' using errcode = '22023';
  end if;
  insert into public.notification_preferences (user_id, event, channel, enabled) values (v_user, p_event, p_channel, p_enabled)
  on conflict (user_id, event, channel) do update set enabled = excluded.enabled;
end;
$$;

-- N-01: mark own in-app notifications read.
create function public.mark_notifications_read(p_ids uuid[]) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_user();
  update public.notifications set status = 'read', read_at = coalesce(read_at, now())
  where id = any (p_ids) and user_id = (select auth.uid()) and channel = 'in_app';
end;
$$;

revoke all on function public.set_notification_preference(text, public.notify_channel, boolean) from public;
revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.set_notification_preference(text, public.notify_channel, boolean) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- notify(): the one way anything goes out (ARCHITECTURE §3.4). One row per channel, skipping channels the
-- person switched off (unless the event is locked) and channels with nowhere to send. In-app rows are
-- complete as soon as they are written. Returns how many rows were queued.
create function private.notify(
  p_event text,
  p_template text,
  p_channels public.notify_channel[],
  p_payload jsonb default '{}',
  p_user uuid default null,
  p_to_phone text default null,
  p_to_email text default null,
  p_dedupe_key text default null,
  p_trip uuid default null,
  p_load uuid default null
) returns int language plpgsql security definer set search_path = '' as $$
declare
  v_channel public.notify_channel;
  v_phone text := p_to_phone;
  v_email text := lower(p_to_email);
  v_language public.language_code := 'en';
  v_count int := 0;
begin
  if p_user is not null then
    select coalesce(v_phone, phone), coalesce(v_email, email), language into v_phone, v_email, v_language
    from public.profiles where id = p_user and deleted_at is null;
  end if;
  foreach v_channel in array p_channels loop
    continue when not private.is_locked_event(p_event) and p_user is not null and exists (
      select 1 from public.notification_preferences
      where user_id = p_user and event = p_event and channel = v_channel and not enabled
    );
    continue when v_channel in ('whatsapp', 'sms') and v_phone is null;
    continue when v_channel = 'email' and v_email is null;
    continue when v_channel in ('push', 'in_app') and p_user is null;
    insert into public.notifications (event, user_id, to_phone, to_email, channel, template_code, language, payload, status, sent_at, dedupe_key, trip_id, load_id)
    values (
      p_event, p_user,
      case when v_channel in ('whatsapp', 'sms') then v_phone end,
      case when v_channel = 'email' then v_email end,
      v_channel, p_template, coalesce(v_language, 'en'), coalesce(p_payload, '{}'),
      case when v_channel = 'in_app' then 'delivered'::public.notify_status else 'queued' end,
      case when v_channel = 'in_app' then now() end,
      case when p_dedupe_key is not null then p_dedupe_key || ':' || v_channel end,
      p_trip, p_load
    )
    on conflict (dedupe_key) do nothing;
    if found then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function private.notify(text, text, public.notify_channel[], jsonb, uuid, text, text, text, uuid, uuid) from public;

-- ---------------------------------------------------------------------------------------------------
-- The dispatcher's side (service role only): claim a batch exactly once, then report each result.
-- ---------------------------------------------------------------------------------------------------

-- Takes up to p_limit queued rows that are due. SKIP LOCKED plus claimed_at means two dispatcher runs at
-- once never get the same row; a run that died leaves its rows claimable again after 5 minutes.
create function public.claim_notifications(p_limit int default 25)
returns table (id uuid, event text, channel public.notify_channel, template_code text, language public.language_code, payload jsonb, to_phone text, to_email text, attempts int)
language sql security definer set search_path = '' as $$
  update public.notifications n
  set claimed_at = now(), attempts = n.attempts + 1
  where n.id in (
    select q.id from public.notifications q
    where q.status = 'queued' and q.next_attempt_at <= now() and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
    order by q.next_attempt_at, q.created_at
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
    for update skip locked
  )
  returning n.id, n.event, n.channel, n.template_code, n.language, n.payload, n.to_phone, n.to_email, n.attempts;
$$;

-- p_result: 'sent', 'failed' (try again later, up to 5 attempts) or 'skipped' (this channel can't be used).
-- A WhatsApp message that finally fails falls back to SMS when sms_fallback_enabled.
create function public.finish_notification(p_id uuid, p_result text, p_provider_message_id text default null, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.notifications;
begin
  select * into v_row from public.notifications where id = p_id for update;
  if v_row.id is null or v_row.status <> 'queued' or v_row.claimed_at is null then
    return; -- already finished (a duplicate report changes nothing)
  end if;
  if p_result = 'sent' then
    update public.notifications set status = 'sent', sent_at = now(), provider_message_id = left(p_provider_message_id, 200), claimed_at = null, error = null where id = p_id;
  elsif p_result = 'skipped' then
    update public.notifications set status = 'skipped', claimed_at = null, error = left(p_error, 300) where id = p_id;
  elsif v_row.attempts < 5 then
    -- 1, 2, 4, 8 minutes.
    update public.notifications
    set claimed_at = null, error = left(p_error, 300), next_attempt_at = now() + make_interval(mins => power(2, v_row.attempts - 1)::int)
    where id = p_id;
  else
    update public.notifications set status = 'failed', claimed_at = null, error = left(p_error, 300) where id = p_id;
    if v_row.channel = 'whatsapp' and coalesce((private.setting('sms_fallback_enabled'))::boolean, true) then
      insert into public.notifications (event, user_id, to_phone, channel, template_code, language, payload, fallback_of, trip_id, load_id)
      values (v_row.event, v_row.user_id, v_row.to_phone, 'sms', v_row.template_code, v_row.language, v_row.payload, v_row.id, v_row.trip_id, v_row.load_id);
    end if;
  end if;
end;
$$;

revoke all on function public.claim_notifications(int) from public;
revoke all on function public.finish_notification(uuid, text, text, text) from public;
grant execute on function public.claim_notifications(int) to service_role;
grant execute on function public.finish_notification(uuid, text, text, text) to service_role;

-- Queue the test message (BUILD.md Phase 1 acceptance), for staff: super admins only.
create function public.queue_test_notification(p_to_email text, p_reference text) returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.notify('system.test', 'system.test', array['email']::public.notify_channel[], jsonb_build_object('reference', left(p_reference, 40)), null, null, p_to_email, 'system.test:' || left(p_reference, 40));
end;
$$;
revoke all on function public.queue_test_notification(text, text) from public;
grant execute on function public.queue_test_notification(text, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- The job dispatcher (ARCHITECTURE §2): every minute pg_cron asks pg_net to POST /api/jobs/dispatch with
-- JOBS_SECRET. The URL and secret live in Supabase Vault ('jobs_dispatch_url', 'jobs_secret'); until both
-- exist (a fresh database, CI) the call is simply skipped.
-- ---------------------------------------------------------------------------------------------------

create function private.call_dispatcher() returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'jobs_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'jobs_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  -- Only when there is work: the dispatcher itself is cheap, but this keeps the logs quiet.
  if not exists (select 1 from public.notifications where status = 'queued' and next_attempt_at <= now()) then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end;
$$;
revoke all on function private.call_dispatcher() from public;

select cron.schedule('jobs-dispatch', '* * * * *', $$select private.call_dispatcher()$$);
