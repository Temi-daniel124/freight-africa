import "server-only";
import { fillPercent, type TruckLoad } from "@/components/art/truck";
import { progressStep } from "@/features/booking/data";
import { lagosDate, lagosTime } from "@/features/booking/pieces";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import type { TrackData } from "./tracking-view";

type MapRow = {
  ref: string; status: string; load_status: string; goods: string; weight_kg: number | null; quantity: number | null; quantity_unit: string | null;
  from_city: string; to_city: string; from_lat: number; from_lng: number; to_lat: number; to_lng: number;
  truck_lat: number | null; truck_lng: number | null; last_ping_at: string | null; pickup_from: string; delivered_at: string | null;
  plate: string; truck_type: string; truck_type_code: string; capacity_kg: number;
  driver_first_name: string | null; driver_avatar: string | null; driver_phone: string | null; held_kobo: number | null;
};

/** One trip for the map (trip_map checks who may see it, and hides the phone and money as D018/D003 say). */
export async function trackData(tripId: string): Promise<TrackData | null> {
  const supabase = await supabaseServer();
  const { data } = await (supabase.rpc as unknown as (fn: string, args: object) => Promise<{ data: MapRow[] | null }>)("trip_map", { p_trip: tripId });
  const r = data?.[0];
  if (!r) return null;
  const load: TruckLoad = r.weight_kg
    ? { kind: "weight", percent: fillPercent(r.weight_kg, r.capacity_kg), line: `${r.weight_kg / 1000} t of ${r.capacity_kg / 1000} t` }
    : r.quantity_unit === "head"
      ? { kind: "livestock", text: `${r.goods.split(",")[0]} · ${r.quantity} head` }
      : { kind: "amount", goods: r.goods, amount: r.quantity ? `about ${r.quantity} ${r.quantity_unit}` : undefined };
  const amount = r.quantity_unit === "head" ? `${r.quantity} head` : r.weight_kg ? `${r.weight_kg / 1000} t` : r.quantity ? `about ${r.quantity} ${r.quantity_unit}` : "";
  return {
    ref: r.ref,
    statusLabel: messages.trips.status[r.status as keyof typeof messages.trips.status] ?? r.status,
    step: progressStep(r.load_status, r.status),
    goods: r.goods,
    amount,
    load,
    from: { name: r.from_city, lat: r.from_lat, lng: r.from_lng, date: lagosDate.format(new Date(r.pickup_from)) },
    to: { name: r.to_city, lat: r.to_lat, lng: r.to_lng, date: r.delivered_at ? lagosDate.format(new Date(r.delivered_at)) : "—" },
    truck: r.truck_lat !== null && r.truck_lng !== null ? { lat: r.truck_lat, lng: r.truck_lng } : null,
    lastSeen: r.last_ping_at ? lagosTime.format(new Date(r.last_ping_at)) : null,
    plate: r.plate,
    truckType: r.truck_type,
    truckTypeCode: r.truck_type_code,
    driver: r.driver_first_name ? { firstName: r.driver_first_name, avatar: r.driver_avatar, phone: r.driver_phone } : null,
    heldKobo: r.held_kobo === null ? null : Number(r.held_kobo),
  };
}

/** The live trip of a sender's load, if any. */
export async function tripForLoad(loadId: string) {
  const { data } = await (await supabaseServer()).from("trips").select("id, status").eq("load_id", loadId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.id ?? null;
}
