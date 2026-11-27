import { Package } from "lucide-react";
import Link from "next/link";
import { StatusChip } from "@/components/ui/chip";
import { naira } from "@/features/booking/pieces";
import { dayLabel } from "@/features/checkout/data";
import type { FleetTruck } from "@/features/home/owner-home";
import messages from "@/messages/en.json";

// O12 / OD02 load cards. Owners see the city, day, goods and a value band, never the address, the
// sender's phone or the exact value (owner README "What owners never see").

const o = messages.owner;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

type BoardRow = {
  load_id: string;
  ref: string;
  from_city: string;
  to_city: string;
  goods: string;
  weight_kg: number | null;
  quantity: number | null;
  quantity_unit: string | null;
  truck_type: string;
  truck_type_id: string;
  pickup_from: string;
  pickup_until: string;
  freight_kobo: number;
  payout_kobo: number;
  value_band: string;
  offered: boolean;
  list_freight_kobo: number;
  sender_name: string;
  sender_trips: number;
  replied: boolean;
  funded_at: string | null;
};

export type BoardLoad = {
  id: string;
  ref: string;
  from: string;
  to: string;
  goods: string;
  weightKg: number | null;
  quantity: number | null;
  unit: string | null;
  truckType: string;
  truckTypeId: string;
  pickupFrom: string;
  pickupUntil: string;
  freightKobo: number;
  payoutKobo: number;
  band: string;
  offered: boolean;
  listFreightKobo: number;
  sender: string;
  senderTrips: number;
  replied: boolean;
  /** A free truck of the right type that can carry it ("For KAN 219 BT"). */
  forPlate: string | null;
};

const spaced = (plate: string) => plate.replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");

export function toBoardLoad(r: BoardRow, trucks: FleetTruck[]): BoardLoad {
  const free = trucks.find(
    (x) => !x.trip_id && x.status === "active" && x.availability !== "unavailable" && x.truck_type === r.truck_type && (!r.weight_kg || x.capacity_kg >= r.weight_kg),
  );
  return {
    id: r.load_id,
    ref: r.ref,
    from: r.from_city,
    to: r.to_city,
    goods: r.goods,
    weightKg: r.weight_kg,
    quantity: r.quantity,
    unit: r.quantity_unit,
    truckType: r.truck_type,
    truckTypeId: r.truck_type_id,
    pickupFrom: r.pickup_from,
    pickupUntil: r.pickup_until,
    freightKobo: Number(r.freight_kobo),
    payoutKobo: Number(r.payout_kobo),
    band: r.value_band,
    offered: r.offered,
    listFreightKobo: Number(r.list_freight_kobo),
    sender: r.sender_name,
    senderTrips: r.sender_trips,
    replied: r.replied,
    forPlate: free ? spaced(free.plate) : null,
  };
}

export function slotOf(iso: string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date(iso)));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export function amountLine(l: Pick<BoardLoad, "goods" | "weightKg" | "quantity" | "unit">) {
  const parts = [l.goods];
  if (l.weightKg) parts.push(`${Math.round(l.weightKg / 1000)} t`);
  if (l.quantity && l.unit && l.unit !== "tonnes") parts.push(`${l.quantity.toLocaleString("en-NG")} ${l.unit}`);
  return parts.join(" · ");
}

export function LoadCard({ load: l, compact = false, href }: { load: BoardLoad; compact?: boolean; href?: string }) {
  return (
    <li>
      <Link href={href ?? `/app/haul/loads?load=${l.id}`} className="block rounded-card border border-line bg-surface px-4.5 pt-4 pb-4 hover:border-green-700/40">
        <div className="flex items-center justify-between gap-2">
          {l.forPlate ? <StatusChip tone="success">{fill(o.forTruck, { plate: l.forPlate })}</StatusChip> : <span />}
          {l.replied ? <StatusChip tone="neutral">{o.replied}</StatusChip> : l.offered ? <StatusChip tone="warning">{o.sendersOffer}</StatusChip> : <StatusChip tone="neutral">{l.band.replace(/^under/, "Under").replace(/^over/, "Over")}</StatusChip>}
        </div>
        <p className="mt-2 text-title-3 text-ink">
          {l.from} → {l.to}
        </p>
        <p className="text-meta text-ink-3">
          {dayLabel(l.pickupFrom)}, {slotOf(l.pickupFrom)} · {l.truckType.toLowerCase()}
        </p>
        {compact ? null : (
          <p className="mt-2.5 flex items-center gap-2 text-body-sm text-ink">
            <Package aria-hidden className="size-4.5 text-[#B8732E]" strokeWidth={1.8} />
            {amountLine(l)}
          </p>
        )}
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-line-soft pt-3">
          <div>
            <p className="text-meta text-ink-3">{l.offered ? o.youdGet : o.youGet}</p>
            <p className="tabular text-title-1 font-semibold text-ink">{naira(l.payoutKobo)}</p>
            {compact ? null : (
              <p className="text-caption text-ink-3">{l.offered ? fill(o.offerLine, { amount: naira(l.freightKobo), usual: naira(l.listFreightKobo) }) : fill(o.freight, { amount: naira(l.freightKobo) })}</p>
            )}
          </div>
          {compact ? null : (
            <div className="text-right">
              <p className="text-meta text-ink-2">{l.sender}</p>
              <p className="text-caption text-ink-3">{l.senderTrips ? (l.senderTrips === 1 ? o.senderTripsOne : fill(o.senderTrips, { n: l.senderTrips })) : o.senderNew}</p>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
