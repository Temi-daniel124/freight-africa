-- Slice 11 (Phase 3 finish). SYSTEM-LOGIC 7.5: a payout or refund that fails is tried again at 1, 5, 15
-- and 60 minutes, then marked failed for finance (shown in My work). 7.6: every day at 06:00 Lagos the
-- ledger is checked: escrow of a finished load must be zero, and every paid payout and refund must have
-- its ledger posting. Differences become reconciliation items for finance. (Comparing with the Bachs
-- report joins when the Bachs account is live, D048.)

alter table public.payouts add column next_attempt_at timestamptz not null default now();
alter table public.refunds add column attempts int not null default 0;
alter table public.refunds add column last_error text check (last_error is null or char_length(last_error) <= 200);
alter table public.refunds add column next_attempt_at timestamptz not null default now();

create function public.money_out_failed(p_kind text, p_id uuid, p_error text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_attempts int;
  v_wait int[] := array[1, 5, 15, 60];
  v_error text := left(coalesce(p_error, 'send failed'), 200);
  v_state text;
begin
  if p_kind = 'payout' then
    update public.payouts set attempts = attempts + 1, last_error = v_error where id = p_id and status = 'processing' returning attempts into v_attempts;
  elsif p_kind = 'refund' then
    update public.refunds set attempts = attempts + 1, last_error = v_error where id = p_id and status = 'processing' returning attempts into v_attempts;
  else
    raise exception 'payout or refund' using errcode = '22023';
  end if;
  if v_attempts is null then
    return null;
  end if;
  v_state := case when v_attempts <= array_length(v_wait, 1) then 'queued' else 'failed' end;
  if p_kind = 'payout' then
    update public.payouts set status = v_state::public.payout_status,
      next_attempt_at = case when v_state = 'queued' then now() + make_interval(mins => v_wait[v_attempts]) else next_attempt_at end
    where id = p_id;
  else
    update public.refunds set status = v_state::public.refund_status,
      next_attempt_at = case when v_state = 'queued' then now() + make_interval(mins => v_wait[v_attempts]) else next_attempt_at end
    where id = p_id;
  end if;
  if v_state = 'failed' then
    perform private.audit('money_out.failed', p_kind || 's', p_id::text, null, jsonb_build_object('attempts', v_attempts, 'error', v_error));
  end if;
  return v_state;
end;
$$;
revoke all on function public.money_out_failed(text, uuid, text) from public, anon, authenticated;
grant execute on function public.money_out_failed(text, uuid, text) to service_role;

create table public.reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  kind text not null check (kind in ('escrow_not_zero', 'payout_without_posting', 'refund_without_posting', 'provider_difference')),
  subject_id uuid,
  ref text,
  expected_kobo bigint,
  found_kobo bigint,
  status text not null default 'open' check (status in ('open', 'resolved')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  unique (day, kind, subject_id)
);
alter table public.reconciliation_items enable row level security;
create policy "reconciliation: finance and super admins" on public.reconciliation_items for select to authenticated
  using ((select public.is_staff_in(array['super_admin', 'finance']::public.staff_role[])));
revoke all on public.reconciliation_items from anon, authenticated;
grant select on public.reconciliation_items to authenticated;
grant select, insert, update on public.reconciliation_items to service_role;

create function private.daily_reconciliation(p_day date default ((now() at time zone 'Africa/Lagos')::date - 1)) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_count int := 0;
  v_rows int;
begin
  -- Escrow of a load whose trip is finished (closed or cancelled), or of a refunded load, must be zero.
  insert into public.reconciliation_items (day, kind, subject_id, ref, expected_kobo, found_kobo)
  select p_day, 'escrow_not_zero', l.id, l.ref, 0, private.ledger_balance(a.id)
  from public.ledger_accounts a
  join public.loads l on l.id = a.load_id
  where a.kind = 'escrow'
    and (l.status in ('refunded', 'cancelled', 'expired') or exists (select 1 from public.trips t where t.load_id = l.id and t.status in ('closed', 'cancelled')))
    and coalesce(private.ledger_balance(a.id), 0) <> 0
  on conflict (day, kind, subject_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;
  insert into public.reconciliation_items (day, kind, subject_id, expected_kobo)
  select p_day, 'payout_without_posting', p.id, p.amount_kobo
  from public.payouts p
  where p.status = 'paid' and p.ledger_transaction_id is null and (p.paid_at at time zone 'Africa/Lagos')::date <= p_day
  on conflict (day, kind, subject_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;
  insert into public.reconciliation_items (day, kind, subject_id, expected_kobo)
  select p_day, 'refund_without_posting', r.id, r.amount_kobo
  from public.refunds r
  where r.status = 'paid' and r.ledger_transaction_id is null and (r.paid_at at time zone 'Africa/Lagos')::date <= p_day
  on conflict (day, kind, subject_id) do nothing;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;
  return v_count;
end;
$$;
revoke all on function private.daily_reconciliation(date) from public;

-- 06:00 Lagos is 05:00 UTC.
select cron.schedule('reconciliation-daily', '0 5 * * *', $$select private.daily_reconciliation()$$);

-- X12: finance marks an item resolved, with a note (to the audit log).
create function public.resolve_reconciliation(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  if not public.is_staff_in(array['super_admin', 'finance']::public.staff_role[]) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 5 and 500 then
    raise exception 'a note of 5 to 500 characters' using errcode = '22023';
  end if;
  update public.reconciliation_items set status = 'resolved', note = btrim(p_note), resolved_at = now(), resolved_by = v_user where id = p_id and status = 'open';
  if not found then
    raise exception 'nothing open' using errcode = 'P0002';
  end if;
  perform private.audit('reconciliation.resolved', 'reconciliation_items', p_id::text, null, jsonb_build_object('note', btrim(p_note)));
end;
$$;
revoke all on function public.resolve_reconciliation(uuid, text) from public, anon;
grant execute on function public.resolve_reconciliation(uuid, text) to authenticated;
