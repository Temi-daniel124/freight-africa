-- 24 Nov 2026: the founder becomes the first super admin, and every setting that changes who gets paid,
-- how much or when needs a second super admin (D037). A sole super admin may approve alone, but only
-- after re-entering their two-step code, and that is written to the audit log.

-- ---------------------------------------------------------------------------------------------------
-- The first super admin (CLAUDE.md §1). The founder has now confirmed the email by signing in; the
-- slice 5 migration ran before that, so it granted nothing. Same guard: a confirmed email only, and a
-- no-op on a fresh database (CI) or when run again. The staff_members audit trigger logs it.
-- ---------------------------------------------------------------------------------------------------

insert into public.staff_members (user_id, role)
select p.id, 'super_admin'
from public.profiles p
join auth.users u on u.id = p.id
where p.email = 'temmydaniel124@gmail.com' and lower(u.email) = p.email and u.email_confirmed_at is not null
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------------------------------
-- Money settings (D037). Time and tier values decide when money moves or how much an owner is
-- advanced, so they join the kobo and rate settings. The dispute window and hold (SYSTEM-LOGIC §13)
-- become settings here, also money.
-- ---------------------------------------------------------------------------------------------------

insert into public.settings (key, value, is_money, description) values
  ('dispute_window_hours', '48', true, 'Hours after delivery a sender may still report a problem and change the claimed amount.'),
  ('dispute_hold_bps', '1000', true, 'Share of the unpaid balance held when a problem is reported without a count, in basis points (10%).'),
  ('dispute_two_person_kobo', '100000000', true, 'Dispute decisions above this need a second approval, in kobo (₦1m).')
on conflict (key) do nothing;

update public.settings set is_money = true
where key in ('auto_release_hours', 'free_waiting_hours', 'tier_established_trips', 'tier_gold_trips', 'tier_gold_rating', 'agent_share_months')
  and not is_money;

-- ---------------------------------------------------------------------------------------------------
-- Sole super admin approval (D037). The requester may decide their own item only when they are the one
-- active super admin and their session verified an authenticator code in the last 5 minutes (the
-- session's `amr` claim carries a timestamp for each verified factor).
-- ---------------------------------------------------------------------------------------------------

alter table public.approvals add column self_approved boolean not null default false;
alter table public.approvals drop constraint approver_is_not_requester;
alter table public.approvals add constraint approver_is_not_requester
  check (approved_by is null or approved_by <> requested_by or self_approved);

create function private.totp_verified_within(p_seconds int) returns boolean language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2' and exists (
    select 1 from jsonb_array_elements(coalesce((select auth.jwt() -> 'amr'), '[]'::jsonb)) a
    where a ->> 'method' = 'totp'
      and (a ->> 'timestamp') ~ '^[0-9]+$'
      and (a ->> 'timestamp')::bigint >= extract(epoch from now())::bigint - p_seconds
  );
$$;
revoke all on function private.totp_verified_within(int) from public;

create function private.active_super_admins() returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.staff_members s
  join public.profiles p on p.id = s.user_id and p.status = 'active' and p.deleted_at is null
  where s.role = 'super_admin' and s.active;
$$;
revoke all on function private.active_super_admins() from public;

-- For the X-17 screen: whether this person may approve their own request, and so must re-enter a code.
create function public.can_self_approve() returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff('super_admin') and private.active_super_admins() = 1;
$$;
revoke all on function public.can_self_approve() from public;
grant execute on function public.can_self_approve() to authenticated;

create or replace function public.decide_approval(p_approval uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_approval public.approvals;
  v_self boolean := false;
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
    -- D037: alone only while there is no second super admin, and only with a freshly entered code.
    if private.active_super_admins() <> 1 then
      raise exception 'a second person must approve' using errcode = '42501';
    end if;
    if not private.totp_verified_within(300) then
      raise exception 'enter your two-step code again to approve this' using errcode = '28000';
    end if;
    v_self := true;
  end if;
  update public.approvals
  set status = case when p_approve then 'approved' else 'rejected' end, approved_by = v_user, decided_at = now(),
      self_approved = v_self, note = coalesce(nullif(btrim(p_note), ''), note)
  where id = p_approval;
  if v_self then
    perform private.audit(
      'approval_decided_alone', 'approvals', p_approval::text, null,
      jsonb_build_object('approved', p_approve, 'reason', 'only super admin; two-step code re-entered', 'subject', v_approval.subject_id, 'payload', v_approval.payload)
    );
  end if;
  if p_approve then
    update public.settings set value = v_approval.payload -> 'to', updated_by = v_user, updated_at = now() where key = v_approval.subject_id;
    if not found then
      raise exception 'unknown setting' using errcode = 'P0002';
    end if;
  end if;
end;
$$;
