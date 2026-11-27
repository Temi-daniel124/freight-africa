import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/chip";
import { OWNER_TRIP_SELECT, type OwnerTrip } from "@/features/booking/owner-trips";
import { naira } from "@/features/booking/pieces";
import { DemoTripSteps } from "@/features/booking/trip-controls";
import { trackData } from "@/features/tracking/data";
import { TripMap } from "@/features/tracking/trip-map";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { ChangeDriver } from "./trip-client";

// O15 / OD05 owner trip: the map, what you get (advance and balance, commission), the driver with Change
// driver before loading, the sender, the timeline. Calls during a live trip come with Phase 4 (D018);
// report a problem with Phase 5; return loads with Phase 6.

const t = messages.ownerTrip;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const ORDER = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived", "delivered", "delivered_with_exception", "closed"];
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso)).replace(",", "");

export async function OwnerTripView({ id }: { id: string }) {
  const supabase = await supabaseServer();
  const [{ data }, { data: money }, { data: payouts }, map] = await Promise.all([
    supabase.from("trips").select(`${OWNER_TRIP_SELECT}, transporter_org_id, driver_id`).eq("id", id).maybeSingle(),
    supabase.rpc("trip_money", { p_trip: id }),
    supabase.from("payouts").select("kind, status, amount_kobo, paid_at").eq("trip_id", id),
    trackData(id),
  ]);
  if (!data) notFound();
  const r = data as unknown as OwnerTrip & { transporter_org_id: string; driver_id: string | null };
  const m = money?.[0];
  const { data: team } = await supabase.rpc("team_members", { p_org: r.transporter_org_id });
  const drivers = (team ?? []).filter((d) => d.is_driver && d.status === "active").map((d) => ({ id: d.user_id, name: d.full_name ?? "" }));
  const at = ORDER.indexOf(r.status);
  const advance = (payouts ?? []).find((p) => p.kind === "advance");
  const balance = (payouts ?? []).find((p) => p.kind === "balance");
  const to = r.load?.to?.name ?? "";
  const headline =
    r.status === "cancelled" ? t.headline.cancelled : at >= ORDER.indexOf("delivered") ? fill(t.headline.delivered, { to }) : at >= 4 ? fill(t.headline.road, { to }) : at >= 2 ? t.headline.loading : t.headline.toPickup;
  const fillLine = r.load?.weight_kg && r.truck ? fill(messages.owner.full, { p: Math.round((r.load.weight_kg / r.truck.capacity_kg) * 100), w: Math.round(r.load.weight_kg / 1000), c: Math.round(r.truck.capacity_kg / 1000) }) : null;
  const plate = r.truck?.plate_number.replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3") ?? "";
  const steps = [
    { title: fill(t.loaded, { place: r.load?.from?.name ?? "" }), sub: r.loaded_at ? `${when(r.loaded_at)}${r.driver?.full_name ? ` · ${r.driver.full_name}` : ""}` : undefined, done: !!r.loaded_at, now: at >= 2 && at < 4 },
    { title: m ? fill(t.advanceSent, { amount: naira(Number(m.advance_kobo)) }) : t.advanceSentPlain, sub: advance?.paid_at ? when(advance.paid_at) : undefined, done: advance?.status === "paid", now: false },
    { title: fill(t.onRoad, { to }), sub: at >= 4 && at < 7 ? t.now : undefined, done: at >= 7, now: at >= 4 && at < 7 },
    { title: fill(t.delivered, { to }), sub: r.delivered_at ? when(r.delivered_at) : undefined, done: at >= 7 && balance?.status === "paid", now: at >= 7 && balance?.status !== "paid" },
  ];
  const routeMap = map ? (
    <TripMap
      route={[map.from, map.to].filter((p) => p.lat !== null).map((p) => ({ lat: p.lat as number, lng: p.lng as number }))}
      trucks={map.truck ? [{ ...map.truck, label: plate }] : []}
      destination={map.to.lat !== null ? { lat: map.to.lat as number, lng: map.to.lng as number } : null}
      interactive={false}
      className="h-full w-full"
    />
  ) : null;

  return (
    <div data-full-screen className="min-h-dvh bg-paper pb-10 lg:mx-auto lg:grid lg:max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6 lg:px-10 lg:py-8">
      <div className="relative h-75 overflow-hidden bg-[#E9EAE4] lg:col-span-2 lg:h-80 lg:rounded-card">
        {routeMap}
        <Link href="/app/haul/trips" aria-label={messages.checkout.back} className="absolute top-3.5 left-4 grid size-11 place-items-center rounded-full border border-line bg-surface text-ink lg:hidden">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
        {map?.lastSeen ? (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-caption font-semibold text-ink shadow-raised">
            <span aria-hidden className="size-2 rounded-full bg-green-500" />
            {fill(t.live, { when: map.lastSeen })}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-3.5 px-5 pt-4 lg:px-0 lg:pt-0">
        <div className="flex items-center justify-between gap-3">
          <p className="tabular truncate text-caption font-semibold tracking-caps text-ink-3 uppercase">
            {r.ref.replace(/-T\d+$/, "")} · {plate}
          </p>
          <StatusChip tone={r.status === "cancelled" ? "danger" : at >= 7 ? "success" : "info"}>{messages.trips.status[r.status as keyof typeof messages.trips.status] ?? r.status}</StatusChip>
        </div>
        <h1 className="text-title-1 text-ink">{headline}</h1>
        {m ? (
          <section className="rounded-card bg-green-900 p-5 text-white lg:hidden">
            <Payout m={m} advancePaidAt={advance?.status === "paid" ? advance.paid_at : null} balancePaid={balance?.status === "paid"} />
          </section>
        ) : null}
        <section className="rounded-card border border-line bg-surface p-4.5">
          <div className="flex items-center gap-3.5">
            <Avatar name={r.driver?.full_name ?? "—"} size={48} />
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">{r.driver?.full_name ?? t.noDriver}</p>
              {fillLine ? <p className="text-meta font-semibold text-ink-2">{fillLine}</p> : null}
            </div>
          </div>
          <div className="mt-3.5">
            <ChangeDriver tripId={r.id} current={r.driver_id} drivers={drivers} allowed={at < 4 && !r.loaded_at} />
          </div>
          <p className="mt-2 text-caption text-ink-3">{t.onlyBefore}</p>
        </section>
        {r.load?.shipper?.name ? (
          <section className="flex items-center gap-3 rounded-card border border-line bg-surface p-4.5">
            <Avatar name={r.load.shipper.name} size={44} />
            <p className="min-w-0 text-body font-semibold text-ink">{fill(t.sender, { name: r.load.shipper.name })}</p>
          </section>
        ) : null}
        <h2 className="mt-1 text-body font-semibold text-ink">{t.timeline}</h2>
        <ol className="rounded-card border border-line bg-surface p-4.5">
          {steps.map((s) => (
            <li key={s.title} className="flex items-start gap-3 py-1.5">
              <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", s.done ? "bg-green-700 text-white" : s.now ? "border-2 border-green-700" : "border-2 border-line")}>
                {s.done ? <Check className="size-3.5" strokeWidth={2.6} /> : null}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-body", s.done || s.now ? "font-semibold text-ink" : "text-ink-3")}>{s.title}</span>
                {s.sub ? <span className="block text-meta text-ink-3">{s.sub}</span> : null}
              </span>
            </li>
          ))}
        </ol>
        <Link href="/app/haul/help" className="mx-auto flex min-h-12 items-center text-body font-semibold text-ink-2">
          {t.help}
        </Link>
        {r.load?.is_demo ? <DemoTripSteps tripId={r.id} status={r.status} /> : null}
      </div>
      {m ? (
        <aside className="hidden self-start lg:block">
          <section className="rounded-card bg-green-900 p-6 text-white">
            <Payout m={m} advancePaidAt={advance?.status === "paid" ? advance.paid_at : null} balancePaid={balance?.status === "paid"} />
          </section>
        </aside>
      ) : null}
    </div>
  );
}

function Payout({ m, advancePaidAt, balancePaid }: { m: { freight_kobo: number; commission_kobo: number; advance_kobo: number; balance_kobo: number }; advancePaidAt: string | null; balancePaid: boolean }) {
  const youGet = Number(m.freight_kobo) - Number(m.commission_kobo);
  const pct = Number(m.freight_kobo) ? Math.round((Number(m.commission_kobo) / Number(m.freight_kobo)) * 1000) / 10 : 0;
  const row = (done: boolean, label: string, amount: number) => (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="flex items-start gap-2.5">
        <span aria-hidden className={cn("mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full", done ? "bg-green-300 text-green-900" : "border-2 border-white/40")}>
          {done ? <Check className="size-3.5" strokeWidth={2.6} /> : null}
        </span>
        <span className="text-body">{label}</span>
      </span>
      <span className="tabular text-body">{naira(amount)}</span>
    </div>
  );
  return (
    <>
      <div className="flex items-center justify-between border-b border-white/15 pb-3">
        <span className="text-body-sm text-green-300">{t.youGet}</span>
        <span className="tabular text-title-2">{naira(youGet)}</span>
      </div>
      <div className="mt-2">
        {row(!!advancePaidAt, advancePaidAt ? fill(t.advancePaid, { when: when(advancePaidAt) }) : t.advanceWhen, Number(m.advance_kobo))}
        {row(balancePaid, t.balanceWhen, Number(m.balance_kobo))}
        <div className="flex justify-between py-1.5 text-body text-white/60">
          <span>{fill(t.commission, { pct })}</span>
          <span className="tabular">{naira(Number(m.commission_kobo))}</span>
        </div>
      </div>
    </>
  );
}
