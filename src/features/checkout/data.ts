import "server-only";
import { redirect } from "next/navigation";
import { requireUnlocked } from "@/features/auth/unlock";
import { shells } from "@/features/shell/config";
import { getViewer } from "@/features/shell/viewer";
import { loadLine, oneLoad } from "@/features/booking/data";
import { supabaseServer } from "@/lib/supabase/server";
import type { PayProps, ReturnProps, SeveralDraft } from "./screens";

// Reads for the D048/D049 pay screens. Row-level security decides what each person sees.

/** "Thu 26 Nov" in Lagos time. */
export const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(iso)).replace(",", "");

/** Signed in, PIN entered, a sender account (D044): the pay screens live outside the shell, so they check here. */
export async function senderGate(next: string) {
  const gate = await requireUnlocked("/app/ship");
  if (!gate) redirect(`/auth?next=${encodeURIComponent(next)}`);
  return getViewer(shells.shipper);
}

const UNPAID = ["draft", "awaiting_payment", "expired"] as const;

export async function payPage(loadId: string): Promise<PayProps | null> {
  const data = await oneLoad(loadId);
  if (!data) return null;
  const { load } = data;
  if (!(UNPAID as readonly string[]).includes(load.status)) redirect(`/app/ship/trips/${load.id}`);
  const supabase = await supabaseServer();
  const [{ data: total, error }, { count }] = await Promise.all([
    supabase.rpc("load_pay_total", { p_load: load.id }),
    supabase.from("load_items").select("id", { count: "exact", head: true }).eq("load_id", load.id),
  ]);
  const amount = error || total == null ? load.totalKobo : Number(total);
  // The split shown is the stored one scaled to the new total (the fee is what the database charges).
  const fee = amount === load.totalKobo ? load.feeKobo : Math.round((load.feeKobo * amount) / load.totalKobo / 10000) * 10000;
  const items = count ?? 1;
  const tonnes = load.weightKg ? ` · ${items === 1 ? "1 item" : `${items} items`}, about ${Math.round(load.weightKg / 1000)} t` : ` · ${items === 1 ? "1 item" : `${items} items`}`;
  const route = `${load.from} → ${load.to}`;
  return {
    loadId: load.id,
    reference: load.ref,
    route,
    summary: `${dayLabel(load.pickupFrom)} · ${load.truckType.toLowerCase()}${tonnes}`,
    draftLine: `${route} · ${dayLabel(load.pickupFrom)}`,
    amountKobo: amount,
    freightKobo: amount - fee,
    feeKobo: fee,
    back: `/app/ship/trips/${load.id}`,
  };
}

type PaymentRow = {
  id: string;
  status: string;
  purpose: string;
  amount_kobo: number;
  load_id: string;
  loads: { ref: string; pickup_from: string; from: { name: string } | null; to: { name: string } | null } | null;
};

const state = (status: string): ReturnProps["initial"] => (status === "received" ? "paid" : status === "failed" ? "failed" : "pending");

export async function returnPage(kind: "payment" | "batch", id: string): Promise<ReturnProps | null> {
  const supabase = await supabaseServer();
  if (kind === "batch") {
    const { data: batch } = await supabase.from("payment_batches").select("id, status, amount_kobo").eq("id", id).maybeSingle();
    if (!batch) return null;
    const { count } = await supabase.from("payments").select("id", { count: "exact", head: true }).eq("batch_id", id);
    const n = count ?? 2;
    return {
      kind,
      id,
      reference: `${n} trips`,
      amountKobo: Number(batch.amount_kobo),
      route: `${n} trips`,
      loadId: null,
      retryable: false,
      draftLine: "",
      initial: state(batch.status),
    };
  }
  const { data } = await supabase
    .from("payments")
    .select("id, status, purpose, amount_kobo, load_id, loads(ref, pickup_from, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name))")
    .eq("id", id)
    .maybeSingle();
  const p = data as unknown as PaymentRow | null;
  if (!p) return null;
  const route = p.loads ? `${p.loads.from?.name ?? ""} → ${p.loads.to?.name ?? ""}` : "";
  return {
    kind,
    id,
    reference: p.loads?.ref ?? "",
    amountKobo: Number(p.amount_kobo),
    route,
    loadId: p.load_id,
    retryable: p.purpose === "load",
    draftLine: p.loads ? `${route} · ${dayLabel(p.loads.pickup_from)}` : route,
    initial: state(p.status),
  };
}

/** The demo checkout's amount: what is still due on the payment or batch with this reference. */
export async function demoCheckout(ref: string): Promise<{ amountKobo: number } | null> {
  const supabase = await supabaseServer();
  const [{ data: payment }, { data: batch }] = await Promise.all([
    supabase.from("payments").select("amount_kobo, received_kobo, provider").eq("provider_ref", ref).maybeSingle(),
    supabase.from("payment_batches").select("amount_kobo, received_kobo, provider").eq("provider_ref", ref).maybeSingle(),
  ]);
  const row = payment ?? batch;
  if (!row || row.provider !== "demo") return null;
  return { amountKobo: Math.max(Number(row.amount_kobo) - Number(row.received_kobo), 0) };
}

/** P15c: the business's drafts that can be paid now (a pick-up day still ahead). */
export async function severalDrafts(orgId: string): Promise<SeveralDraft[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("loads")
    .select("id, status, total_kobo, pickup_from, weight_kg, quantity, quantity_unit, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), goods:goods_categories(name)")
    .eq("shipper_org_id", orgId)
    .in("status", UNPAID)
    .gt("pickup_from", new Date(Date.now() - 3600_000).toISOString())
    .order("pickup_from")
    .limit(10);
  return ((data ?? []) as unknown as Array<Record<string, unknown> & { from: { name: string } | null; to: { name: string } | null; goods: { name: string } | null }>).map((r) => ({
    id: r.id as string,
    route: `${r.from?.name ?? ""} → ${r.to?.name ?? ""}`,
    line: [
      [r.goods?.name, loadLine({ weightKg: r.weight_kg as number | null, quantity: r.quantity as number | null, quantityUnit: r.quantity_unit as string | null, goods: r.goods?.name ?? "" })]
        .filter(Boolean)
        .join(", "),
      dayLabel(r.pickup_from as string),
    ].join(" · "),
    totalKobo: Number(r.total_kobo),
  }));
}


const SLOT_NAME = (fromIso: string, untilIso: string) => {
  const hour = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date(iso)));
  const [a, b] = [hour(fromIso), hour(untilIso)];
  if (a <= 6 && b >= 21) return "any time";
  if (a < 12) return "morning";
  if (a < 17) return "afternoon";
  return "evening";
};

/** P11 / P11b / P11c / D08: a paid booking still waiting for a truck. Null when it isn't one. */
export async function findingProps(loadId: string): Promise<import("./finding").FindingProps | null> {
  const data = await oneLoad(loadId);
  if (!data || data.load.status !== "funded" || data.load.trip) return null;
  const { load, stops } = data;
  const supabase = await supabaseServer();
  const [{ data: extra }, { data: items }, { data: offers }, { data: perms }] = await Promise.all([
    supabase.from("loads").select("funded_at, no_truck_decision_due_at, fee_bps, from_city_id, to_city_id, truck_type_id, offer_total_kobo, shipper_org_id").eq("id", loadId).maybeSingle(),
    supabase.from("load_items").select("description, quantity, quantity_unit, weight_kg").eq("load_id", loadId).order("seq"),
    supabase
      .from("offers")
      .select("id, kind, amount_kobo, status, expires_at, transporter_org_id, transporter:organizations(name, tier), truck:trucks(capacity_kg, truck_type:truck_types(name))")
      .eq("load_id", loadId)
      .in("kind", ["counter", "reoffer"]),
    supabase.rpc("org_permissions", { p_org: data.shipperOrg }),
  ]);
  if (!extra) return null;
  const { data: avail } = await supabase.rpc("day_availability", { p_org: extra.shipper_org_id, p_from: extra.from_city_id, p_to: extra.to_city_id, p_days: 8 });
  const feeOn = (diff: number) => diff + Math.round((diff * extra.fee_bps) / 10000 / 10000) * 10000;
  type OfferRow = { id: string; kind: string; amount_kobo: number; status: string; expires_at: string | null; transporter_org_id: string; transporter: { name: string; tier: string | null } | null; truck: { capacity_kg: number; truck_type: { name: string } | null } | null };
  const rows = (offers ?? []) as unknown as OfferRow[];
  const reoffered = new Set(rows.filter((o) => o.kind === "reoffer").map((o) => o.transporter_org_id));
  const now = Date.now();
  const replies = rows
    .filter((o) => o.kind === "counter" && o.status === "pending" && o.expires_at && new Date(o.expires_at).getTime() > now)
    .map((o) => {
      const pay = feeOn(Number(o.amount_kobo) - load.freightKobo);
      return {
        id: o.id,
        org: o.transporter?.name ?? "",
        tier: o.transporter?.tier ?? null,
        truck: o.truck ? `${(o.truck.truck_type?.name ?? load.truckType).toLowerCase()} ${Math.round(o.truck.capacity_kg / 1000)} t` : load.truckType.toLowerCase(),
        totalKobo: load.totalKobo + pay,
        payKobo: pay,
        expiresAt: o.expires_at as string,
        canOfferAgain: !reoffered.has(o.transporter_org_id),
      };
    })
    .sort((a, b) => a.totalKobo - b.totalKobo);
  const pickup = stops.find((s) => s.kind === "pickup");
  const drop = [...stops].reverse().find((s) => s.kind === "dropoff");
  const city = (s: typeof pickup) => (s?.city as unknown as { name: string } | null)?.name ?? "";
  const place = (s: typeof pickup) => (s ? `${s.address_text.split(",")[0]}, ${city(s)}` : "");
  const list = items ?? [];
  const goodsLine =
    list
      .map((i) => (i.quantity ? `${i.description.replace(/^(Bags|Cartons) of /i, "").replace(/^\w/, (x) => x.toUpperCase())}, ${i.quantity.toLocaleString("en-NG")} ${i.quantity_unit === "tonnes" ? "t" : i.quantity_unit}` : i.description))
      .join(" · ") || load.goods;
  const slot = SLOT_NAME(load.pickupFrom, load.pickupUntil);
  const truckLine = `${load.truckType.toLowerCase()} ${Math.round(load.capacityKg / 1000)} t`;
  const can = (p: string) => ((perms ?? []) as string[]).includes(p);
  return {
    loadId: load.id,
    reference: load.ref,
    route: `${load.from} → ${load.to}`,
    places: `${place(pickup)} → ${place(drop)}`,
    pickupLine: `${dayLabel(load.pickupFrom)}, ${slot}`,
    pickupShort: `${dayLabel(load.pickupFrom)} · ${slot}`,
    itemsLine: `${list.length === 1 ? "1 item" : `${list.length} items`} · ${truckLine}`,
    goodsLine,
    receiver: drop?.contact_name ?? null,
    heldKobo: load.totalKobo,
    totalKobo: load.totalKobo,
    offered: extra.offer_total_kobo != null,
    fundedAt: extra.funded_at,
    createdAt: load.createdAt,
    due: !!extra.no_truck_decision_due_at && new Date(extra.no_truck_decision_due_at).getTime() <= now,
    replies,
    truckName: load.truckType,
    days: ((avail ?? []) as { day: string; truck_type_id: string; free: number }[])
      .filter((r) => r.truck_type_id === extra.truck_type_id && r.day > new Date(load.pickupFrom).toISOString().slice(0, 10))
      .slice(0, 8)
      .map((r) => ({ day: r.day, free: Number(r.free) })),
    canCancel: can("cancel_own_booking"),
  };
}
