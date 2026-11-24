-- Phase 2 slice 6: bank accounts that need a person to look (SYSTEM-LOGIC §10: name match below 80, or
-- no verified identity yet). Finance staff and super admins decide, the roles that can read bank
-- accounts (RLS). Approved accounts still wait out their 24 hours; the hold is released by a job that
-- runs every 15 minutes.

create function public.decide_bank_account(p_account uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_account public.bank_accounts;
  v_note text := nullif(btrim(p_note), '');
  v_owner uuid;
begin
  if not public.is_staff_in(array['super_admin', 'finance']::public.staff_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not p_approve and v_note is null then
    raise exception 'say why, so they can fix it' using errcode = '22023';
  end if;
  select * into v_account from public.bank_accounts where id = p_account for update;
  if v_account.id is null or v_account.status <> 'needs_review' then
    raise exception 'this account is not waiting' using errcode = 'P0002';
  end if;
  if v_account.added_by = v_user then
    raise exception 'nobody approves their own bank account' using errcode = '42501';
  end if;
  update public.bank_accounts
  set status = case when not p_approve then 'disabled' when usable_from <= now() then 'active' else 'pending_hold' end
  where id = p_account;
  perform private.audit(case when p_approve then 'bank_account_approved' else 'bank_account_rejected' end, 'bank_accounts', p_account::text, null,
    jsonb_build_object('note', v_note, 'name_match_score', v_account.name_match_score));
  if not p_approve then
    update public.organizations set default_bank_account_id = null where id = v_account.org_id and default_bank_account_id = p_account;
    select m.user_id into v_owner from public.organization_members m where m.org_id = v_account.org_id and m.transporter_role = 'owner' and m.status = 'active' limit 1;
    perform private.notify('bank_account.rejected', 'bank_account.rejected', array['in_app', 'email']::public.notify_channel[],
      jsonb_build_object('last4', v_account.account_last4, 'reason', v_note), v_owner, p_dedupe_key => 'bank-rejected:' || p_account::text);
  end if;
end;
$$;
revoke all on function public.decide_bank_account(uuid, boolean, text) from public;
grant execute on function public.decide_bank_account(uuid, boolean, text) to authenticated;

select cron.schedule('bank-holds', '*/15 * * * *', $$select private.release_bank_holds()$$);

insert into public.message_templates (code, channel, subject, body, variables) values
  ('bank_account.rejected', 'email', 'We couldn''t accept your bank account', 'We couldn''t accept the bank account ending {{last4}} for your payouts: {{reason}} Open the app to add another.', '{last4,reason}'),
  ('bank_account.rejected', 'in_app', null, 'Bank account ending {{last4}} not accepted: {{reason}}', '{last4,reason}');
