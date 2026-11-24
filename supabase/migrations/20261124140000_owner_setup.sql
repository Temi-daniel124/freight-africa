-- Phase 2 slice 3: the transporter setup (ux-owner.md T-ON-02 to T-ON-04, ux-owner-driver.md):
-- where the trucks are based and which routes they run, whether the owner drives (owner-driver,
-- D003), and the payout bank account (DATA-MODEL §2 bank_accounts; SYSTEM-LOGIC §10; SECURITY §5).

-- ---------------------------------------------------------------------------------------------------
-- The business's base and routes (T-ON-02). New trucks start with these routes.
-- ---------------------------------------------------------------------------------------------------

alter table public.organizations
  add column home_city_id uuid references public.cities (id),
  add column corridor_ids uuid[] not null default '{}';

grant select (home_city_id, corridor_ids) on public.organizations to authenticated;

-- T-ON-02: owners save their base, routes and whether they drive. Returns nothing; the owner-driver
-- choice changes their membership (is_driver), which gives them the Drive tab.
create function public.save_transporter_profile(p_org uuid, p_home_city uuid, p_corridors uuid[], p_drives boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not exists (
    select 1 from public.organization_members m join public.organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = v_user and m.transporter_role = 'owner' and m.status = 'active' and o.kind = 'transporter'
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_home_city is not null and not exists (select 1 from public.cities where id = p_home_city) then
    raise exception 'unknown city' using errcode = '22023';
  end if;
  if coalesce(cardinality(p_corridors), 0) = 0 or exists (select 1 from unnest(p_corridors) c where not exists (select 1 from public.corridors where id = c and active)) then
    raise exception 'choose at least one route' using errcode = '22023';
  end if;
  update public.organizations set home_city_id = p_home_city, corridor_ids = p_corridors where id = p_org;
  update public.organization_members set is_driver = coalesce(p_drives, false) where org_id = p_org and user_id = v_user;
  update public.profiles set joining_as = case when coalesce(p_drives, false) then 'owner_driver' else 'owner' end where id = v_user;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Bank accounts (T-ON-04). The number is encrypted with a key that lives only in Supabase Vault; the
-- app shows the last four digits. A new account is usable 24 hours after it's added; a name that
-- doesn't match the verified owner (score below 80) waits for staff (SYSTEM-LOGIC §10).
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'bank_number_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'bank_number_key', 'Encrypts bank account numbers (bank_accounts.account_number_enc)');
  end if;
end;
$$;

create function private.bank_key() returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'bank_number_key';
$$;
revoke all on function private.bank_key() from public;

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  bank_code text not null check (bank_code ~ '^[0-9]{3,6}$'),
  bank_name text not null check (char_length(bank_name) between 2 and 80),
  account_number_enc bytea not null,
  account_last4 text not null check (account_last4 ~ '^[0-9]{4}$'),
  resolved_name text not null check (char_length(resolved_name) between 2 and 120),
  name_match_score int not null check (name_match_score between 0 and 100),
  status text not null default 'pending_hold' check (status in ('pending_hold', 'active', 'needs_review', 'disabled')),
  usable_from timestamptz not null default now() + interval '24 hours',
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bank_accounts_org on public.bank_accounts (org_id, created_at desc);
create trigger bank_accounts_touch before update on public.bank_accounts for each row execute function private.touch_updated_at();

alter table public.organizations add column default_bank_account_id uuid references public.bank_accounts (id) on delete set null;
grant select (default_bank_account_id) on public.organizations to authenticated;

-- The audit trigger never copies the encrypted number.
create function private.audit_bank_account() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'account_number_enc' end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'account_number_enc' end;
begin
  perform private.audit(lower(tg_op), 'bank_accounts', coalesce(new.id, old.id)::text, v_old, v_new);
  return null;
end;
$$;
revoke all on function private.audit_bank_account() from public;
create trigger bank_accounts_audit after insert or update or delete on public.bank_accounts for each row execute function private.audit_bank_account();

alter table public.bank_accounts enable row level security;
-- Owners (only) see their business's accounts (T-ON-04 "Owners only"); finance staff see all.
create policy "bank_accounts: owners read" on public.bank_accounts for select to authenticated using (
  exists (select 1 from public.organization_members m where m.org_id = bank_accounts.org_id and m.user_id = (select auth.uid()) and m.transporter_role = 'owner' and m.status = 'active')
);
create policy "bank_accounts: finance read" on public.bank_accounts for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])));
revoke all on public.bank_accounts from anon, authenticated;
grant select (id, org_id, bank_code, bank_name, account_last4, resolved_name, name_match_score, status, usable_from, created_at) on public.bank_accounts to authenticated;
grant select, insert, update, delete on public.bank_accounts to service_role;

-- Called by the server after the payment provider has looked the account up (the name and score come
-- from that lookup, never from the person typing). The service role only: a person cannot claim a name.
create function public.add_bank_account(p_user uuid, p_org uuid, p_bank_code text, p_bank_name text, p_account_number text, p_resolved_name text, p_score int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_first boolean;
begin
  if not exists (
    select 1 from public.organization_members m join public.organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = p_user and m.transporter_role = 'owner' and m.status = 'active' and o.kind = 'transporter'
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_account_number !~ '^[0-9]{10}$' then
    raise exception 'an account number has 10 digits' using errcode = '22023';
  end if;
  v_first := not exists (select 1 from public.bank_accounts where org_id = p_org and status <> 'disabled');
  insert into public.bank_accounts (org_id, bank_code, bank_name, account_number_enc, account_last4, resolved_name, name_match_score, status, added_by)
  values (
    p_org, p_bank_code, btrim(p_bank_name),
    extensions.pgp_sym_encrypt(p_account_number, private.bank_key()),
    right(p_account_number, 4), upper(btrim(p_resolved_name)), greatest(0, least(100, p_score)),
    case when p_score < 80 then 'needs_review' else 'pending_hold' end,
    p_user
  )
  returning id into v_id;
  -- One payout account at a time: the new one replaces the old, and payouts wait out its 24 hours.
  update public.bank_accounts set status = 'disabled' where org_id = p_org and id <> v_id and status <> 'disabled';
  update public.organizations set default_bank_account_id = v_id where id = p_org;
  if not v_first then
    perform private.notify('bank_account.changed', 'bank_account.changed', array['in_app', 'email']::public.notify_channel[],
      jsonb_build_object('last4', right(p_account_number, 4)), p_user, p_dedupe_key => 'bank:' || v_id::text);
  end if;
  return v_id;
end;
$$;
revoke all on function public.add_bank_account(uuid, uuid, text, text, text, text, int) from public, anon, authenticated;
grant execute on function public.add_bank_account(uuid, uuid, text, text, text, text, int) to service_role;

-- The hold ends on its own: payout code treats pending_hold past usable_from as active. This job tidies
-- the status so screens say "Ready" (run by the dispatcher later; harmless to run any time).
create function private.release_bank_holds() returns int language sql security definer set search_path = '' as $$
  with done as (update public.bank_accounts set status = 'active' where status = 'pending_hold' and usable_from <= now() returning 1)
  select count(*)::int from done;
$$;
revoke all on function private.release_bank_holds() from public;

insert into public.message_templates (code, channel, subject, body, variables) values
  ('bank_account.changed', 'email', 'Your payout bank account was changed', 'The bank account for your Freight Africa payouts was changed to one ending {{last4}}. Payouts wait 24 hours. If this wasn''t you, contact us now.', '{last4}'),
  ('bank_account.changed', 'in_app', null, 'Payout account changed to one ending {{last4}}. Payouts wait 24 hours.', '{last4}');

-- ---------------------------------------------------------------------------------------------------
-- SECURITY §11: staff opening someone's ID photo is logged with the reason.
-- ---------------------------------------------------------------------------------------------------

create function public.log_identity_photo_view(p_session uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff_in(array['super_admin', 'verification']::public.staff_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform private.audit('identity_photo_viewed', 'verification_sessions', p_session::text, null, jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)));
end;
$$;
revoke all on function public.log_identity_photo_view(uuid, text) from public;
grant execute on function public.log_identity_photo_view(uuid, text) to authenticated;

revoke all on function public.save_transporter_profile(uuid, uuid, uuid[], boolean) from public;
grant execute on function public.save_transporter_profile(uuid, uuid, uuid[], boolean) to authenticated;
