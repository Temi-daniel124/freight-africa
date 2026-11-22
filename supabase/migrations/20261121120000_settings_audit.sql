-- Phase 1 slice 6: the settings table with every value from SYSTEM-LOGIC.md §11, two-person approval for
-- money settings (ROLES-AND-PERMISSIONS.md §8), and the append-only audit log (DATA-MODEL.md §11).

-- ---------------------------------------------------------------------------------------------------
-- Audit log: append-only; written only by triggers and server functions.
-- ---------------------------------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  -- 'staff:<role>', 'user', or 'system' (jobs, migrations).
  actor_role text not null,
  action text not null check (char_length(action) between 1 and 80),
  table_name text,
  row_id text,
  old jsonb,
  new jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_log_row on public.audit_log (table_name, row_id, created_at desc);
create index audit_log_actor on public.audit_log (actor_user_id, created_at desc);

create function private.audit_log_is_append_only() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'the audit log cannot be changed' using errcode = '42501';
end;
$$;
create trigger audit_log_no_update before update or delete on public.audit_log for each row execute function private.audit_log_is_append_only();
create trigger audit_log_no_truncate before truncate on public.audit_log for each statement execute function private.audit_log_is_append_only();

alter table public.audit_log enable row level security;
create policy "audit_log: super admins read" on public.audit_log for select to authenticated using ((select public.is_staff('super_admin')));
grant select on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;

-- Who is acting, from the request (PostgREST passes the JWT and headers as settings).
create function private.audit_actor_role() returns text language sql stable security definer set search_path = '' as $$
  select case
    when (select auth.uid()) is null then 'system'
    else coalesce((select 'staff:' || s.role::text from public.staff_members s where s.user_id = (select auth.uid()) and s.active), 'user')
  end;
$$;

create function private.request_header(p_name text) returns text language sql stable set search_path = '' as $$
  select nullif(left(coalesce(current_setting('request.headers', true), '{}')::jsonb ->> p_name, 300), '');
$$;

-- One audit row, for server functions that log an action without a table change (a sensitive read).
create function private.audit(p_action text, p_table text default null, p_row text default null, p_old jsonb default null, p_new jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor_user_id, actor_role, action, table_name, row_id, old, new, ip, user_agent)
  values (
    (select auth.uid()), private.audit_actor_role(), p_action, p_table, p_row, p_old, p_new,
    split_part(coalesce(private.request_header('x-forwarded-for'), ''), ',', 1),
    private.request_header('user-agent')
  );
end;
$$;
revoke all on function private.audit(text, text, text, jsonb, jsonb) from public;

-- The trigger for audited tables: every insert, update and delete, with the row before and after.
-- TG_ARGV[0] names the key column(s) used as row_id.
create function private.audit_row() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row text;
begin
  select string_agg(coalesce(v_new, v_old) ->> k, '/') into v_row from unnest(string_to_array(tg_argv[0], ',')) as k;
  -- Never copy secrets into the log.
  v_old := v_old - 'token_hash' - 'code_hash' - 'nin_enc';
  v_new := v_new - 'token_hash' - 'code_hash' - 'nin_enc';
  perform private.audit(lower(tg_op), tg_table_name, v_row, v_old, v_new);
  return null;
end;
$$;
revoke all on function private.audit_row() from public;

create trigger staff_members_audit after insert or update or delete on public.staff_members for each row execute function private.audit_row('user_id');
create trigger organization_members_audit after insert or update or delete on public.organization_members for each row execute function private.audit_row('org_id,user_id');
create trigger invites_audit after insert or update or delete on public.invites for each row execute function private.audit_row('id');

-- ---------------------------------------------------------------------------------------------------
-- Settings (SYSTEM-LOGIC §11): every configurable number in one place.
-- ---------------------------------------------------------------------------------------------------

create table public.settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  value jsonb not null,
  -- Money settings (kobo, basis points, card payments) change only with a second super admin (§8).
  is_money boolean not null default false,
  description text not null check (char_length(description) between 1 and 300),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger settings_audit after insert or update or delete on public.settings for each row execute function private.audit_row('key');

alter table public.settings enable row level security;
create policy "settings: staff read" on public.settings for select to authenticated using ((select public.is_staff()));
grant select on public.settings to authenticated;
grant select, insert, update on public.settings to service_role;

insert into public.settings (key, value, is_money, description) values
  ('city_radius_km', '30', false, 'How far from a city centre still counts as that city, in km.'),
  ('extra_stop_kobo', '1000000', true, 'Price of each extra stop, in kobo (₦10,000).'),
  ('max_dropoffs', '4', false, 'Most drop-offs on one load.'),
  ('payment_expiry_hours', '24', false, 'Hours a booking waits for payment before it expires.'),
  ('no_truck_decision_hours', '24', false, 'Hours after funding with no truck before the sender decides what to do.'),
  ('gold_head_start_minutes', '10', false, 'Minutes gold owners see a funded load before everyone else.'),
  ('load_alert_max_orgs', '30', false, 'Most transporters alerted about one load at a time.'),
  ('counter_max_bps', '2000', true, 'Largest counter offer above the price, in basis points (20%).'),
  ('counter_expiry_hours', '2', false, 'Hours a counter offer stays open.'),
  ('return_load_radius_km', '50', false, 'Distance from a drop-off to look for a return load, in km.'),
  ('geofence_radius_m', '250', false, 'Radius around a stop that counts as arrived, in metres.'),
  ('code_max_attempts', '5', false, 'Wrong tries before a loading or delivery code locks.'),
  ('delivery_code_eta_minutes', '60', false, 'Minutes before arrival that the receiver gets the delivery code.'),
  ('delivery_code_distance_km', '30', false, 'Distance from the drop-off at which the receiver gets the delivery code, in km.'),
  ('min_loading_photos', '3', false, 'Photos needed at loading.'),
  ('auto_release_hours', '24', false, 'Hours after delivery with no problem reported before the balance is released.'),
  ('free_waiting_hours', '4', false, 'Free waiting time at a stop, in hours.'),
  ('waiting_per_hour_kobo', '500000', true, 'Waiting charge per hour after the free time, in kobo (₦5,000); truck types can override it in fee_rules.'),
  ('cancellation_fee_kobo', '2500000', true, 'Cancellation fee after a truck is assigned, in kobo (₦25,000).'),
  ('advance_bps', '{"new": 3000, "established": 4000, "gold": 5000}', true, 'Share of the owner''s pay released at loading, by tier, in basis points.'),
  ('value_limit_kobo', '{"new": 300000000, "established_uninsured": 1000000000}', true, 'Highest goods value a tier may carry, in kobo (₦3m new; ₦10m established without insurance).'),
  ('tracker_required_above_kobo', '2000000000', true, 'Goods value above which a GPS tracker is required, in kobo (₦20m).'),
  ('ping_interval_moving_s', '60', false, 'Seconds between location pings while moving.'),
  ('ping_interval_stationary_s', '180', false, 'Seconds between location pings while stopped.'),
  ('tracking_gap_minutes', '[15, 30, 60]', false, 'Minutes without a ping before a trip is delayed, lost and escalated.'),
  ('deviation_km', '5', false, 'Distance off the route that counts as a deviation, in km.'),
  ('deviation_minutes', '10', false, 'Minutes off the route before a deviation alert.'),
  ('long_stop_minutes', '90', false, 'Minutes stopped away from a stop before an alert.'),
  ('payout_two_person_kobo', '500000000', true, 'Payouts above this need a second approval, in kobo (₦5m).'),
  ('tier_established_trips', '5', false, 'Completed trips to become an established owner.'),
  ('tier_gold_trips', '25', false, 'Completed trips to become a gold owner.'),
  ('tier_gold_rating', '4.3', false, 'Lowest average rating for gold.'),
  ('strike_expiry_days', '90', false, 'Days a strike lasts.'),
  ('strikes_to_suspend', '3', false, 'Strikes that suspend an account.'),
  ('rating_window_days', '7', false, 'Days after delivery to leave a rating.'),
  ('tracking_link_expiry_hours', '72', false, 'Hours a receiver tracking link works after its stop completes.'),
  ('agent_share_bps', '100', true, 'Agent share of each trip, in basis points (1%).'),
  ('agent_share_months', '6', false, 'Months an agent earns from someone they brought.'),
  ('agents_enabled', 'true', false, 'Whether the agent role is offered at all.'),
  ('agent_reminders_per_day', '1', false, 'Reminders an agent may send one person in a day.'),
  ('agent_reminders_per_step', '3', false, 'Reminders an agent may send one person for one sign-up step.'),
  ('agent_booking_expiry_days', '7', false, 'Days a booking an agent prepared waits for the sender to approve it.'),
  ('sms_fallback_enabled', 'true', false, 'Send an SMS when a WhatsApp message fails.'),
  ('card_payments_enabled', 'false', true, 'Whether senders may pay by card.'),
  ('languages_enabled', '["en"]', false, 'Languages offered in the app.'),
  ('chat_open_after_delivery_hours', '48', false, 'Hours trip chat stays open after delivery.'),
  ('driving_lock_speed_kmh', '10', false, 'Speed above which the driver screens lock, in km/h.'),
  ('driving_lock_seconds', '30', false, 'Seconds above that speed before the lock starts.'),
  ('driving_lock_passenger_minutes', '30', false, 'Minutes a passenger unlock lasts.'),
  ('hold_push_until_still_minutes', '2', false, 'Minutes a driver must be still before non-urgent pushes are shown.'),
  ('driver_confirm_reminder_hours', '2', false, 'Hours before a driver is reminded to confirm an assigned trip.');

-- Server code reads settings through this (functions in later slices call private.setting directly).
create function private.setting(p_key text) returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = p_key;
$$;
revoke all on function private.setting(text) from public;

-- The few settings the app itself needs before sign-in or without staff rights.
create function public.public_setting(p_key text) returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = p_key and key in ('agents_enabled', 'languages_enabled', 'card_payments_enabled', 'sms_fallback_enabled');
$$;
revoke all on function public.public_setting(text) from public;
grant execute on function public.public_setting(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Approvals (DATA-MODEL §11; ROLES §8): the requester can never approve their own item. Only
-- setting_change runs from here for now; payouts, refunds and the rest join with their slices.
-- ---------------------------------------------------------------------------------------------------

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('payout', 'refund', 'fee_change', 'setting_change', 'ledger_adjustment', 'dispute_decision', 'staff_role')),
  subject_id text not null,
  payload jsonb not null,
  requested_by uuid not null references public.profiles (id),
  approved_by uuid references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text check (note is null or char_length(note) <= 500),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint approver_is_not_requester check (approved_by is null or approved_by <> requested_by),
  constraint decided_once check ((status = 'pending') = (decided_at is null))
);
create unique index approvals_one_pending on public.approvals (kind, subject_id) where status = 'pending';
create trigger approvals_audit after insert or update or delete on public.approvals for each row execute function private.audit_row('id');

alter table public.approvals enable row level security;
create policy "approvals: super admins and finance read" on public.approvals for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])));
grant select on public.approvals to authenticated;
grant select, insert, update on public.approvals to service_role;

-- Money values are whole, non-negative kobo; rates are 0 to 10,000 basis points (also inside objects,
-- like advance_bps by tier).
create function private.money_value_ok(p_key text, p_value jsonb) returns boolean language sql immutable set search_path = '' as $$
  with v as (
    select x from jsonb_path_query(p_value, 'strict $.**') as x where jsonb_typeof(x) = 'number'
  )
  select case
    when right(p_key, 5) = '_kobo' then not exists (select 1 from v where (x::text)::numeric < 0 or (x::text)::numeric <> trunc((x::text)::numeric))
    when right(p_key, 4) = '_bps' then not exists (select 1 from v where (x::text)::numeric < 0 or (x::text)::numeric > 10000 or (x::text)::numeric <> trunc((x::text)::numeric))
    else true
  end;
$$;

-- A settings value must keep the shape of its default: same JSON type, and for objects the same keys.
create function private.same_shape(p_old jsonb, p_new jsonb) returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(p_old) = jsonb_typeof(p_new)
    and (jsonb_typeof(p_old) <> 'object' or (select array_agg(k order by k) from jsonb_object_keys(p_old) k) = (select array_agg(k order by k) from jsonb_object_keys(p_new) k));
$$;

-- X-21: a super admin changes a setting. Money settings become an approval for a second super admin;
-- the rest change at once. Both are logged. Returns the approval id, or null when applied directly.
create function public.change_setting(p_key text, p_value jsonb, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_setting public.settings;
  v_approval uuid;
begin
  if not public.is_staff('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into v_setting from public.settings where key = p_key for update;
  if v_setting.key is null then
    raise exception 'unknown setting' using errcode = 'P0002';
  end if;
  if p_value is null or not private.same_shape(v_setting.value, p_value) or not private.money_value_ok(p_key, p_value) then
    raise exception 'that value does not fit this setting' using errcode = '22023';
  end if;
  if v_setting.is_money then
    if exists (select 1 from public.approvals where kind = 'setting_change' and subject_id = p_key and status = 'pending') then
      raise exception 'a change to this setting is already waiting for approval' using errcode = '23505';
    end if;
    insert into public.approvals (kind, subject_id, payload, requested_by, note)
    values ('setting_change', p_key, jsonb_build_object('from', v_setting.value, 'to', p_value), v_user, nullif(btrim(p_note), ''))
    returning id into v_approval;
    return v_approval;
  end if;
  update public.settings set value = p_value, updated_by = v_user, updated_at = now() where key = p_key;
  return null;
end;
$$;

-- X-17: another super admin approves or rejects a setting change. The requester can't decide their own.
create function public.decide_approval(p_approval uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_approval public.approvals;
begin
  if not public.is_staff('super_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- Lock the setting before the approval, the same order as change_setting, so the two never deadlock.
  select * into v_approval from public.approvals where id = p_approval;
  if v_approval.kind = 'setting_change' then
    perform 1 from public.settings where key = v_approval.subject_id for update;
  end if;
  select * into v_approval from public.approvals where id = p_approval for update;
  if v_approval.id is null or v_approval.status <> 'pending' then
    raise exception 'this approval is not waiting' using errcode = 'P0002';
  end if;
  if v_approval.kind <> 'setting_change' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_approval.requested_by = v_user then
    raise exception 'a second person must approve' using errcode = '42501';
  end if;
  update public.approvals
  set status = case when p_approve then 'approved' else 'rejected' end, approved_by = v_user, decided_at = now(),
      note = coalesce(nullif(btrim(p_note), ''), note)
  where id = p_approval;
  if p_approve then
    update public.settings set value = v_approval.payload -> 'to', updated_by = v_user, updated_at = now() where key = v_approval.subject_id;
    if not found then
      raise exception 'unknown setting' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

revoke all on function public.change_setting(text, jsonb, text) from public;
revoke all on function public.decide_approval(uuid, boolean, text) from public;
grant execute on function public.change_setting(text, jsonb, text) to authenticated;
grant execute on function public.decide_approval(uuid, boolean, text) to authenticated;
