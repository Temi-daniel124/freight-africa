import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

// Reads for the Phase 3 screens. Row-level security decides what each person sees; drivers never get
// money columns (trips money is read through trip_money, D003).

export type LoadRow = {
  id: string;
  ref: string;
  status: string;
  from: string;
  to: string;
  goods: string;
  weightKg: number | null;
  quantity: number | null;
  quantityUnit: string | null;
  truckType: string;
  truckTypeCode: string;
  capacityKg: number;
  pickupFrom: string;
  pickupUntil: string;
  freightKobo: number;
  feeKobo: number;
  totalKobo: number;
  createdAt: string;
  trip: {
    id: string;
    status: string;
    plate: string | null;
    driverName: string | null;
    lastPingAt: string | null;
    lat: number | null;
    lng: number | null;
    loadedAt: string | null;
    deliveredAt: string | null;
  } | null;
};

const LOAD_SELECT =
  "id, ref, status, weight_kg, quantity, quantity_unit, pickup_from, pickup_until, freight_kobo, fee_kobo, total_kobo, created_at, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), goods:goods_categories(name), truck_type:truck_types(name, code, capacity_kg_default), trips(id, status, last_ping_at, loaded_at, delivered_at, truck:trucks(plate_number), driver:profiles(full_name))";

type Raw = Record<string, unknown> & {
  from: { name: string } | null;
  to: { name: string } | null;
  goods: { name: string } | null;
  truck_type: {
    name: string;
    code: string;
    capacity_kg_default: number;
  } | null;
  trips: {
    id: string;
    status: string;
    last_ping_at: string | null;
    loaded_at: string | null;
    delivered_at: string | null;
    truck: { plate_number: string } | null;
    driver: { full_name: string | null } | null;
  }[];
};

function toRow(raw: Raw): LoadRow {
  const live =
    raw.trips?.find((t) => t.status !== "cancelled") ?? raw.trips?.[0] ?? null;
  return {
    id: raw.id as string,
    ref: raw.ref as string,
    status: raw.status as string,
    from: raw.from?.name ?? "",
    to: raw.to?.name ?? "",
    goods: raw.goods?.name ?? "",
    weightKg: raw.weight_kg as number | null,
    quantity: raw.quantity as number | null,
    quantityUnit: raw.quantity_unit as string | null,
    truckType: raw.truck_type?.name ?? "",
    truckTypeCode: raw.truck_type?.code ?? "",
    capacityKg: raw.truck_type?.capacity_kg_default ?? 30000,
    pickupFrom: raw.pickup_from as string,
    pickupUntil: raw.pickup_until as string,
    freightKobo: Number(raw.freight_kobo),
    feeKobo: Number(raw.fee_kobo),
    totalKobo: Number(raw.total_kobo),
    createdAt: raw.created_at as string,
    trip: live
      ? {
          id: live.id,
          status: live.status,
          plate: live.truck?.plate_number ?? null,
          driverName: live.driver?.full_name ?? null,
          lastPingAt: live.last_ping_at,
          lat: null,
          lng: null,
          loadedAt: live.loaded_at,
          deliveredAt: live.delivered_at,
        }
      : null,
  };
}

export const shipperLoads = cache(
  async (org: string, limit = 50): Promise<LoadRow[]> => {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
      .from("loads")
      .select(LOAD_SELECT)
      .eq("shipper_org_id", org)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) console.error("loading loads failed", error.code);
    return ((data ?? []) as unknown as Raw[]).map(toRow);
  },
);

export const oneLoad = cache(async (id: string) => {
  const supabase = await supabaseServer();
  const [{ data }, { data: stops }, { data: payments }, { data: offers }] =
    await Promise.all([
      supabase
        .from("loads")
        .select(
          `${LOAD_SELECT}, shipper_org_id, declared_value_kobo, goods_description`,
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("load_stops")
        .select(
          "seq, kind, address_text, contact_name, contact_phone, city:cities(name)",
        )
        .eq("load_id", id)
        .order("seq"),
      supabase
        .from("payments")
        .select(
          "id, purpose, amount_kobo, received_kobo, status, virtual_account_number, virtual_account_bank, provider, expires_at, received_at, created_at",
        )
        .eq("load_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("offers")
        .select(
          "id, kind, amount_kobo, status, expires_at, transporter:organizations(name, tier)",
        )
        .eq("load_id", id)
        .eq("kind", "counter")
        .order("created_at", { ascending: false }),
    ]);
  if (!data) return null;
  const raw = data as unknown as Raw & {
    shipper_org_id: string;
    declared_value_kobo: number;
    goods_description: string | null;
  };
  return {
    load: toRow(raw),
    shipperOrg: raw.shipper_org_id,
    description: raw.goods_description,
    stops: stops ?? [],
    payments: payments ?? [],
    offers: offers ?? [],
  };
});

/** "24 t of 30 t", "about 600 bags", "Cattle · 40 head" (D046). */
export function loadLine(
  row: Pick<LoadRow, "weightKg" | "quantity" | "quantityUnit" | "goods">,
) {
  if (row.quantityUnit === "head")
    return `${row.goods.split(",")[0]} · ${row.quantity} head`;
  if (row.weightKg)
    return `${(row.weightKg / 1000).toLocaleString("en-NG", { maximumFractionDigits: 1 })} t`;
  if (row.quantity)
    return `about ${row.quantity.toLocaleString("en-NG")} ${row.quantityUnit}`;
  return "";
}

/** Where a trip is on Booked → Loaded → On the road → Delivered (0–3). */
export function progressStep(loadStatus: string, tripStatus?: string | null) {
  if (
    tripStatus &&
    ["delivered", "delivered_with_exception", "closed"].includes(tripStatus)
  )
    return 3;
  if (tripStatus && ["in_transit", "arrived"].includes(tripStatus)) return 2;
  if (tripStatus === "loaded") return 1;
  return loadStatus === "draft" ? -1 : 0;
}
