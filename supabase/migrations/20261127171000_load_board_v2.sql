-- Combined brief slice 6 (owner O12 / OD02 / O13e): the load board also says whether a load carries the
-- sender's own price (D047), our listed price for it, the sender's business name and how many trips it
-- has finished, and whether this business already replied. Still no address, phone or exact goods value
-- before accepting (owner README "What owners never see").

drop function public.load_board(uuid);

create function public.load_board(p_org uuid) returns table (
  load_id uuid, ref text, from_city text, to_city text, goods text, weight_kg int, quantity int, quantity_unit text,
  truck_type text, truck_type_id uuid, pickup_from timestamptz, pickup_until timestamptz, freight_kobo bigint, payout_kobo bigint, value_band text,
  offered boolean, list_freight_kobo bigint, sender_name text, sender_trips int, replied boolean, funded_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select l.id, l.ref, fc.name, tc.name, g.name, l.weight_kg, l.quantity, l.quantity_unit, tt.name, l.truck_type_id, l.pickup_from, l.pickup_until,
    l.freight_kobo,
    l.freight_kobo - private.round_to(l.freight_kobo * coalesce((private.setting('commission_bps') ->> private.owner_tier(p_org))::int, 500) / 10000.0, 100),
    case when l.declared_value_kobo < 300000000 then 'under ₦3m' when l.declared_value_kobo <= 1000000000 then '₦3m to ₦10m' else 'over ₦10m' end,
    l.offer_total_kobo is not null,
    coalesce(l.list_freight_kobo, l.freight_kobo),
    so.name,
    (select count(*)::int from public.loads x join public.trips t on t.load_id = x.id
      where x.shipper_org_id = l.shipper_org_id and t.status in ('delivered', 'delivered_with_exception', 'closed')),
    exists (select 1 from public.offers o where o.load_id = l.id and o.transporter_org_id = p_org and o.kind = 'counter'),
    l.funded_at
  from public.loads l
  join public.cities fc on fc.id = l.from_city_id
  join public.cities tc on tc.id = l.to_city_id
  join public.goods_categories g on g.id = l.goods_category_id
  join public.truck_types tt on tt.id = l.truck_type_id
  join public.organizations so on so.id = l.shipper_org_id
  where public.can_in_org(p_org, 'load_board') and l.status = 'funded'
    and l.is_demo = coalesce((select is_demo from public.organizations where id = p_org), false)
  order by l.pickup_from;
$$;

revoke all on function public.load_board(uuid) from public, anon;
grant execute on function public.load_board(uuid) to authenticated;
