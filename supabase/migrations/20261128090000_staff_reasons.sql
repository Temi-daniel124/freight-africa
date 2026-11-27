-- Review of #130 (combined brief 5d: every change to money, status or access has a required reason in
-- the audit log). The console calls these reasoned forms. (change_setting and create_staff_invite stay
-- for the existing tests and checks; the app no longer calls them.)
--   change_setting_reasoned: a reason of 5 to 500 characters, kept in the audit log for every change.
--   approve_money_out(kind, id, note): a reason, the amount in the audit log, and an error when there
--     was nothing waiting (it used to succeed silently).
--   invite_staff: inviting a super admin or finance person needs a fresh check (D044), like owners.

create function public.change_setting_reasoned(p_key text, p_value jsonb, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb;
  v_approval uuid;
begin
  if char_length(btrim(coalesce(p_note, ''))) not between 5 and 500 then
    raise exception 'a reason of 5 to 500 characters' using errcode = '22023';
  end if;
  select value into v_old from public.settings where key = p_key;
  v_approval := public.change_setting(p_key, p_value, btrim(p_note));
  perform private.audit(case when v_approval is null then 'setting.changed' else 'setting.change_requested' end, 'settings', p_key,
    jsonb_build_object('value', v_old), jsonb_build_object('value', p_value, 'reason', btrim(p_note), 'approval', v_approval));
  return v_approval;
end;
$$;

drop function public.approve_money_out(text, uuid);
create function public.approve_money_out(p_kind text, p_id uuid, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_requested uuid;
  v_amount bigint;
begin
  if coalesce(public.my_staff_role()::text, '') not in ('finance', 'super_admin') or coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 5 and 500 then
    raise exception 'a reason of 5 to 500 characters' using errcode = '22023';
  end if;
  if p_kind = 'refund' then
    select requested_by, amount_kobo into v_requested, v_amount from public.refunds where id = p_id and status = 'awaiting_approval' for update;
  elsif p_kind = 'payout' then
    select requested_by, amount_kobo into v_requested, v_amount from public.payouts where id = p_id and status = 'awaiting_approval' for update;
  else
    raise exception 'refund or payout' using errcode = '22023';
  end if;
  if v_amount is null then
    raise exception 'nothing waiting for approval' using errcode = 'P0002';
  end if;
  -- The person whose action released or asked for the money can't also approve sending it.
  if v_requested = v_user then
    raise exception 'a second person approves it' using errcode = '42501';
  end if;
  if p_kind = 'refund' then
    update public.refunds set status = 'queued', approved_by = v_user where id = p_id;
  else
    update public.payouts set status = 'queued', approved_by = v_user where id = p_id;
  end if;
  perform private.audit('money_out.approved', p_kind || 's', p_id::text, null, jsonb_build_object('amount_kobo', v_amount, 'reason', btrim(p_note)));
end;
$$;

create function public.invite_staff(p_email text, p_role public.staff_role) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_role in ('super_admin', 'finance') and not private.fresh_ok() then
    raise exception 'confirm it is you first' using errcode = '28000';
  end if;
  return public.create_staff_invite(p_email, p_role, null);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.change_setting_reasoned(text, jsonb, text)', 'public.approve_money_out(text, uuid, text)', 'public.invite_staff(text, public.staff_role)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
