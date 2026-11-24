-- Phase 2 slice 2: identity checks (DATA-MODEL.md §2 verification_sessions; D039 demo provider; D041
-- optional sender check with a Verified sender badge). One table for every purpose: senders (optional),
-- owners (T-ON-03), drivers (D-ON-02) and agents (G-ON-03). With the demo provider, the person uploads a
-- photo of their ID and verification staff approve or decline it; with Didit (when the account exists)
-- the provider's webhook decides. Photos sit in a private bucket that only the person and verification
-- staff can open (SECURITY.md: identity documents).

create table public.verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose text not null check (purpose in ('sender', 'owner', 'driver', 'agent')),
  provider text not null check (provider in ('demo', 'didit', 'smile_id')),
  provider_session_id text check (provider_session_id is null or char_length(provider_session_id) <= 200),
  checks text[] not null default '{id_document}',
  status public.kyc_status not null default 'needs_review',
  id_type text check (id_type is null or id_type in ('nin_slip', 'national_id', 'drivers_licence', 'passport', 'voters_card')),
  name_on_id text check (name_on_id is null or char_length(btrim(name_on_id)) between 2 and 120),
  evidence_paths text[] not null default '{}',
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 300),
  extracted jsonb,
  cost_usd_cents int check (cost_usd_cents is null or cost_usd_cents >= 0),
  reviewed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_sessions_queue on public.verification_sessions (created_at) where status = 'needs_review';
create index verification_sessions_user on public.verification_sessions (user_id, created_at desc);
-- One open check per person and purpose; a declined one can be tried again.
create unique index verification_sessions_one_open on public.verification_sessions (user_id, purpose) where status in ('in_progress', 'needs_review');

create trigger verification_sessions_touch before update on public.verification_sessions for each row execute function private.touch_updated_at();
create trigger verification_sessions_audit after insert or update or delete on public.verification_sessions for each row execute function private.audit_row('id');

alter table public.verification_sessions enable row level security;
create policy "verification_sessions: own" on public.verification_sessions for select to authenticated using (user_id = (select auth.uid()));
-- ROLES §7: verification staff decide; operations and support can see where someone stands.
create policy "verification_sessions: staff read" on public.verification_sessions for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'verification', 'operations', 'support']::public.staff_role[])));
revoke all on public.verification_sessions from anon, authenticated;
grant select on public.verification_sessions to authenticated;
grant select, insert, update, delete on public.verification_sessions to service_role;

-- ---------------------------------------------------------------------------------------------------
-- The private bucket for ID photos: <user id>/<file>. People add only to their own folder and never
-- change or delete (a new check uploads a new photo); verification staff read them.
-- ---------------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification', 'verification', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "verification photos: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification photos: own read" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification photos: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and (select public.is_staff_in(array['super_admin', 'verification']::public.staff_role[])));

-- ---------------------------------------------------------------------------------------------------
-- Submitting (demo provider): the photo must already be in the person's own folder.
-- ---------------------------------------------------------------------------------------------------

create function public.submit_identity_check(p_purpose text, p_id_type text, p_name_on_id text, p_photo_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
begin
  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> v_user::text or p_photo_path like '%..%' then
    raise exception 'that photo is not yours' using errcode = '42501';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'verification' and name = p_photo_path) then
    raise exception 'the photo has not been uploaded' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.verification_sessions where user_id = v_user and purpose = p_purpose and status = 'approved') then
    raise exception 'already verified' using errcode = '23505';
  end if;
  insert into public.verification_sessions (user_id, purpose, provider, status, id_type, name_on_id, evidence_paths)
  values (v_user, p_purpose, 'demo', 'needs_review', p_id_type, btrim(p_name_on_id), array[p_photo_path])
  returning id into v_id;
  update public.profiles set kyc_status = 'needs_review' where id = v_user and kyc_status <> 'approved';
  return v_id;
exception
  when unique_violation then
    raise exception 'a check is already waiting' using errcode = '23505';
end;
$$;

-- X-verification: staff decide. A decline needs a reason the person will read.
create function public.decide_identity_check(p_session uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_session public.verification_sessions;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if not public.is_staff_in(array['super_admin', 'verification']::public.staff_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not p_approve and v_reason is null then
    raise exception 'say why, so they can fix it' using errcode = '22023';
  end if;
  select * into v_session from public.verification_sessions where id = p_session for update;
  if v_session.id is null or v_session.status <> 'needs_review' then
    raise exception 'this check is not waiting' using errcode = 'P0002';
  end if;
  if v_session.user_id = v_user then
    raise exception 'nobody checks their own identity' using errcode = '42501';
  end if;
  update public.verification_sessions
  set status = case when p_approve then 'approved'::public.kyc_status else 'declined'::public.kyc_status end,
      decision_reason = v_reason, reviewed_by = v_user, completed_at = now()
  where id = p_session;
  update public.profiles set kyc_status = case when p_approve then 'approved'::public.kyc_status else 'declined'::public.kyc_status end
  where id = v_session.user_id and (p_approve or kyc_status <> 'approved');
  perform private.notify(
    case when p_approve then 'verification.approved' else 'verification.declined' end,
    case when p_approve then 'verification.approved' else 'verification.declined' end,
    array['in_app', 'email']::public.notify_channel[],
    jsonb_build_object('reason', coalesce(v_reason, '')),
    v_session.user_id,
    p_dedupe_key => 'verification:' || p_session::text
  );
end;
$$;

-- D041: the Verified sender badge owners see on a load: an owner of the sending business has passed.
create function public.is_verified_sender(p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    join public.profiles p on p.id = m.user_id
    join public.organizations o on o.id = m.org_id and o.kind = 'shipper'
    where m.org_id = p_org and m.shipper_role = 'owner' and m.status = 'active' and p.kyc_status = 'approved'
  );
$$;

revoke all on function public.submit_identity_check(text, text, text, text) from public;
revoke all on function public.decide_identity_check(uuid, boolean, text) from public;
revoke all on function public.is_verified_sender(uuid) from public;
grant execute on function public.submit_identity_check(text, text, text, text) to authenticated;
grant execute on function public.decide_identity_check(uuid, boolean, text) to authenticated;
grant execute on function public.is_verified_sender(uuid) to authenticated;

insert into public.message_templates (code, channel, subject, body, variables) values
  ('verification.approved', 'email', 'Your identity is verified', 'Good news: our team has checked your ID. Your account now shows a verified badge.', '{}'),
  ('verification.approved', 'in_app', null, 'Your identity is verified.', '{}'),
  ('verification.declined', 'email', 'We couldn''t verify your ID', 'Our team couldn''t verify your ID: {{reason}} Open the app to send a new photo.', '{reason}'),
  ('verification.declined', 'in_app', null, 'We couldn''t verify your ID: {{reason}}', '{reason}');

-- D039: a business a demo account creates in the app is a demo business too, so the cleanup finds it.
create function private.mark_demo_org() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.profiles where id = new.created_by and is_demo) then
    new.is_demo := true;
  end if;
  return new;
end;
$$;
revoke all on function private.mark_demo_org() from public;
create trigger organizations_mark_demo before insert on public.organizations for each row execute function private.mark_demo_org();
