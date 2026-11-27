import "server-only";
import { loadLine, oneLoad } from "@/features/booking/data";
import { dayLabel } from "@/features/checkout/data";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import type { Step, TripView } from "./sender-trip";

const t = messages.tripPage;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const time = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso)).replace(",", "");
const slot = (fromIso: string) => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date(fromIso)));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
};
const ORDER = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived", "delivered", "delivered_with_exception", "closed"];

/** P14b / P14c / D09 for a booking with a truck. Null when the load has no trip (other screens). */
export async function senderTripView(loadId: string): Promise<TripView | null> {
  const data = await oneLoad(loadId);
  if (!data || !data.load.trip || data.load.status !== "matched") return null;
  const { load, stops, payments } = data;
  const trip = load.trip!;
  const supabase = await supabaseServer();
  const [{ data: extra }, { data: perms }] = await Promise.all([
    supabase.from("loads").select("funded_at, matched_at, trips(transporter:organizations(name))").eq("id", loadId).maybeSingle(),
    supabase.rpc("org_permissions", { p_org: data.shipperOrg }),
  ]);
  const org = ((extra?.trips as unknown as { transporter: { name: string } | null }[] | null)?.[0]?.transporter?.name ?? "").replace(/\s+(Ltd\.?|Limited)$/i, "");
  const at = ORDER.indexOf(trip.status);
  const delivered = at >= ORDER.indexOf("delivered");
  const pickup = stops.find((s) => s.kind === "pickup");
  const drop = [...stops].reverse().find((s) => s.kind === "dropoff");
  const city = (s: typeof pickup) => (s?.city as unknown as { name: string } | null)?.name ?? "";
  const short = (s: typeof pickup) => (s ? s.address_text.split(",")[0] : "");
  const receiver = drop?.contact_name ?? null;
  const pickupPlace = short(pickup);
  const state = (done: boolean, now: boolean): Step["state"] => (done ? "done" : now ? "now" : "later");
  const steps: Step[] = [
    { title: t.t1, when: extra?.funded_at ? time(extra.funded_at) : undefined, state: "done" },
    { title: fill(t.t2, { org: org || load.truckType }), when: extra?.matched_at ? time(extra.matched_at) : undefined, state: "done" },
    { title: fill(t.t3, { place: pickupPlace }), sub: fill(t.t3sub, { day: `${dayLabel(load.pickupFrom).split(" ")[0]} ${slot(load.pickupFrom)}` }), state: state(at >= 2, at < 2) },
    { title: t.t4, state: state(at >= 4, at >= 2 && at < 4) },
    { title: t.t5, state: state(at >= 7, at >= 4 && at < 7) },
    { title: receiver ? fill(t.t6, { name: receiver.split(" ")[0] }) : t.t6NoName, state: state(delivered, at === 6) },
  ];
  const headlineKey = (delivered ? "delivered" : trip.status) as keyof typeof t.headline;
  const deliveredWhen = trip.deliveredAt ? time(trip.deliveredAt) : "";
  const received = payments.find((p) => p.status === "received");
  const goods = [load.goods, loadLine(load)].filter(Boolean).join(", ");
  const can = (p: string) => ((perms ?? []) as string[]).includes(p);
  return {
    loadId: load.id,
    reference: load.ref,
    badge: t.badge[trip.status as keyof typeof t.badge] ?? t.badge.assigned,
    headline: fill(t.headline[headlineKey] ?? t.headline.assigned, { when: deliveredWhen }),
    subline: delivered ? `${load.from} → ${load.to} · ${goods}` : fill(t.loadingLine, { day: dayLabel(load.pickupFrom), slot: slot(load.pickupFrom), place: pickupPlace }),
    deskSub: `${load.ref} · ${load.from} → ${load.to} · loading ${dayLabel(load.pickupFrom)}, ${slot(load.pickupFrom)}`,
    delivered,
    heldKobo: load.totalKobo,
    heldDone: receiver ? fill(t.heldDone, { name: receiver }) : t.heldDoneNoName,
    driver: trip.driverName ? { name: trip.driverName, org: org || "", plate: trip.plate, truck: `${load.truckType} · ${Math.round(load.capacityKg / 1000)} t` } : null,
    steps,
    stops: [
      { place: `${pickupPlace}, ${city(pickup)}`, who: t.you, pickup: true },
      ...(drop ? [{ place: `${short(drop)}, ${city(drop)}`, who: receiver ? fill(t.receiverCode, { name: receiver }) : "", pickup: false }] : []),
    ],
    receiptHref: received ? `/app/ship/receipts/${received.id}` : null,
    bookAgainHref: "/app/ship/book",
    canCancel: (can("cancel_own_booking") || can("cancel_any_booking")) && at < ORDER.indexOf("loaded"),
  };
}
