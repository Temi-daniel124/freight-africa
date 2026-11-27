-- Combined brief slice 5d: P14e "Cancel this booking?" shows the refund before the sender confirms.
-- Read only: the same rules as cancel_load (SYSTEM-LOGIC §4.4, D019), computed without moving money.
-- cancel_load stays the only function that cancels and refunds.

create function public.cancel_quote(p_load uuid,
  out allowed boolean, out refund_kobo bigint, out owner_fee_kobo bigint, out service_kobo bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_load public.loads;
  v_trip public.trips;
  v_held bigint;
begin
  select * into v_load from public.loads where id = p_load;
  if v_load.id is null or not (public.can_in_org(v_load.shipper_org_id, 'cancel_any_booking')
    or (public.can_in_org(v_load.shipper_org_id, 'cancel_own_booking') and v_load.created_by = v_user)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_held := coalesce(private.ledger_balance(private.ledger_account('escrow', null, p_load)), 0);
  allowed := true;
  owner_fee_kobo := 0;
  service_kobo := 0;
  refund_kobo := v_held;
  if v_load.status in ('cancelled', 'refunded') then
    allowed := false;
    refund_kobo := 0;
    return;
  end if;
  if v_load.status <> 'matched' then
    return;
  end if;
  select * into v_trip from public.trips where load_id = p_load and status not in ('cancelled', 'closed');
  if v_trip.status in ('loaded', 'in_transit', 'arrived', 'delivered', 'delivered_with_exception') then
    allowed := false;
    refund_kobo := 0;
    return;
  end if;
  if v_trip.status in ('at_pickup', 'loading') then
    service_kobo := least(v_held, private.fee_due(p_load, v_trip.freight_kobo));
    owner_fee_kobo := greatest(0, least((private.setting('cancellation_fee_kobo'))::bigint, v_held - service_kobo));
    refund_kobo := v_held - service_kobo - owner_fee_kobo;
  end if;
end;
$$;

revoke all on function public.cancel_quote(uuid) from public, anon;
grant execute on function public.cancel_quote(uuid) to authenticated;
