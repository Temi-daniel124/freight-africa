import { FileText, Star, Truck, UserX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { naira } from "@/features/booking/pieces";
import { dayLabel } from "@/features/checkout/data";
import type { FleetTruck } from "@/features/home/owner-home";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { LoadCard, type BoardLoad, toBoardLoad } from "./load-cards";

// O10 / OD01 owner Home: money this month, Needs you, the truck on the road, loads for your trucks, your
// trucks and the track record. "You get" is always after commission. Problems held (OD01 "Held for a
// problem") come with disputes in Phase 5.

const o = messages.owner;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived"];
const ROAD = ["loaded", "in_transit", "arrived"];

function inDays(n: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(Date.now() + n * 86400000));
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function daysUntil(day: string) {
  return Math.max(0, Math.round((new Date(`${day}T12:00:00+01:00`).getTime() - Date.now()) / 86400000));
}

function truckPill(x: FleetTruck, paperDays: number | null): { text: string; tone: StatusTone } {
  if (x.trip_id) return { text: o.onTrip, tone: "info" };
  if (paperDays !== null && paperDays <= 14) return { text: fill(o.licenceDays, { n: paperDays }), tone: "warning" };
  if (x.status === "active" && x.availability !== "unavailable") return { text: o.available, tone: "success" };
  if (x.status === "pending_review" || x.status === "draft") return { text: o.inReview, tone: "warning" };
  return { text: o.paused, tone: "neutral" };
}

const fullLine = (w: number | null, cap: number) => (w ? fill(o.full, { p: Math.round((w / cap) * 100), w: Math.round(w / 1000), c: Math.round(cap / 1000) }) : null);

function Head({ title, action, caps }: { title: string; action?: React.ReactNode; caps?: boolean }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
      <h2 className={cn(caps ? "text-caption font-semibold tracking-caps text-ink-3 uppercase" : "text-lead font-semibold text-ink")}>{title}</h2>
      {action}
    </div>
  );
}

export async function OwnerHome({ viewer }: { viewer: Promise<Viewer>; drives?: boolean }) {
  const { orgId } = await viewer;
  if (!orgId) return null;
  const supabase = await supabaseServer();
  const lagosMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).format(new Date());
  const monthStart = new Date(`${lagosMonth}-01T00:00:00+01:00`).toISOString();
  const [{ data: fleet }, { data: board }, { data: payouts }, { data: papers }, { data: org }, { data: trips }, { data: rates }] = await Promise.all([
    supabase.rpc("fleet", { p_org: orgId }),
    supabase.rpc("load_board", { p_org: orgId }),
    supabase.from("payouts").select("amount_kobo, status, paid_at, trip_id, kind").eq("org_id", orgId).gte("created_at", daysAgo(120)),
    supabase.from("documents").select("id, expires_on, subject_kind, subject_id, doc_type:document_types(name)").eq("subject_kind", "truck").lte("expires_on", inDays(30)).eq("status", "approved"),
    supabase.from("organizations").select("tier").eq("id", orgId).maybeSingle(),
    supabase.from("trips").select("id, status").eq("transporter_org_id", orgId).in("status", ["delivered", "delivered_with_exception", "closed"]),
    supabaseAdmin().from("settings").select("key, value").in("key", ["advance_bps", "commission_bps"]),
  ]);
  const trucks: FleetTruck[] = (fleet ?? []) as FleetTruck[];
  const tier = (org?.tier ?? "new") as keyof typeof o.tier;
  const rate = (key: string) => Number(((rates ?? []).find((r) => r.key === key)?.value as Record<string, number> | undefined)?.[tier] ?? 0) / 100;
  const paidMonth = (payouts ?? []).filter((p) => p.status === "paid" && p.paid_at && p.paid_at >= monthStart).reduce((s, p) => s + Number(p.amount_kobo), 0);
  const coming = (payouts ?? []).filter((p) => ["queued", "awaiting_approval", "processing", "held"].includes(p.status)).reduce((s, p) => s + Number(p.amount_kobo), 0);
  const paperFor = new Map<string, { days: number; type: string }>();
  for (const p of papers ?? []) {
    if (!p.expires_on || !p.subject_id) continue;
    const d = daysUntil(p.expires_on);
    const type = (p.doc_type as unknown as { name: string } | null)?.name ?? "";
    if (!paperFor.has(p.subject_id) || paperFor.get(p.subject_id)!.days > d) paperFor.set(p.subject_id, { days: d, type });
  }
  const needs = [
    ...[...paperFor.entries()].slice(0, 2).map(([truckId, p]) => {
      const plate = trucks.find((x) => x.truck_id === truckId)?.plate ?? "";
      return {
        key: `paper-${truckId}`,
        icon: <FileText aria-hidden className="size-5" strokeWidth={1.8} />,
        tone: "warning",
        title: fill(p.days === 0 ? o.paperEndsToday : o.paperEnds, { paper: p.type, plate, n: p.days }),
        sub: o.paperPause,
        href: "/app/haul/documents",
        action: o.update,
        primary: true,
      };
    }),
    ...trucks
      .filter((x) => x.trip_id && !x.driver_name)
      .map((x) => ({ key: `driver-${x.truck_id}`, icon: <UserX aria-hidden className="size-5" strokeWidth={1.8} />, tone: "danger", title: fill(o.noDriver, { plate: x.plate }), sub: o.noDriverSub, href: `/app/haul/trips/${x.trip_id}`, action: o.choose, primary: false })),
  ];
  const road = trucks.find((x) => x.trip_status && ROAD.includes(x.trip_status)) ?? trucks.find((x) => x.trip_status && LIVE.includes(x.trip_status));
  let roadMoney: { advance: number; balance: number } | null = null;
  if (road?.trip_id) {
    const { data } = await supabase.rpc("trip_money", { p_trip: road.trip_id });
    const m = data?.[0];
    if (m) roadMoney = { advance: Number(m.advance_kobo), balance: Number(m.balance_kobo) };
  }
  const advancePaid = road?.trip_id ? (payouts ?? []).some((p) => p.trip_id === road.trip_id && p.kind === "advance" && p.status === "paid") : false;
  const loads: BoardLoad[] = ((board ?? []) as Parameters<typeof toBoardLoad>[0][]).map((l) => toBoardLoad(l, trucks));
  const tripCount = (trips ?? []).length;
  const recordSub = fill(tier === "gold" ? o.recordGold : o.recordSub, { advance: rate("advance_bps"), commission: rate("commission_bps") });

  const hero = (
    <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-card bg-green-900 text-white lg:gap-4 lg:overflow-visible lg:bg-transparent">
      <Link href="/app/haul/earnings" className="px-4.5 py-4 lg:rounded-card lg:bg-green-900 lg:px-6 lg:py-6">
        <p className="text-meta text-green-300 lg:text-body-sm lg:text-white/80">{o.paidMonth}</p>
        <p className="tabular truncate text-[clamp(20px,6.4vw,28px)] leading-tight font-semibold lg:text-[34px]">{naira(paidMonth)}</p>
      </Link>
      <Link href="/app/haul/earnings" className="px-4.5 py-4 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:px-6 lg:py-6 lg:text-ink">
        <p className="text-meta text-green-300 lg:text-body-sm lg:text-ink-2">{o.coming}</p>
        <p className="tabular truncate text-[clamp(20px,6.4vw,28px)] leading-tight font-semibold lg:text-[34px]">{naira(coming)}</p>
      </Link>
    </div>
  );

  const needsYou = needs.length ? (
    <section>
      <Head title={o.needsYou} caps />
      <ul className="rounded-card border border-line bg-surface px-4.5 lg:px-6">
        {needs.map((n) => (
          <li key={n.key} className="flex items-center gap-3.5 border-t border-line-soft py-4 first:border-t-0">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon", n.tone === "warning" ? "bg-warning-100 text-warning" : "bg-danger-100 text-danger")}>{n.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-ink">{n.title}</p>
              <p className="text-meta text-ink-3">{n.sub}</p>
            </div>
            <Link href={n.href} className={buttonVariants({ size: "sm", variant: n.primary ? "primary" : "secondary" })}>
              {n.action}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const onRoad = road ? (
    <section className="lg:hidden">
      <Head title={o.onTheRoad} caps />
      <Link href={`/app/haul/trips/${road.trip_id}`} className="block rounded-card border border-line bg-surface p-4.5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-caption font-semibold tracking-caps text-ink-3 uppercase">
            {road.plate} · {road.driver_name ?? ""}
          </p>
          <StatusChip tone="info">{messages.trips.status[road.trip_status as keyof typeof messages.trips.status] ?? road.trip_status}</StatusChip>
        </div>
        <p className="mt-1.5 text-title-3 text-ink">
          {road.from_city} → {road.to_city}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-meta text-ink-3">
          {road.lat !== null ? <span aria-hidden className="size-2 rounded-full bg-green-500" /> : null}
          {road.lat !== null ? o.live : null}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
            <span className="block h-full rounded-pill bg-green-900" style={{ width: `${road.weight_kg ? Math.min(100, Math.round((road.weight_kg / road.capacity_kg) * 100)) : 60}%` }} />
          </span>
          {fullLine(road.weight_kg, road.capacity_kg) ? <span className="text-caption text-ink-2">{fullLine(road.weight_kg, road.capacity_kg)}</span> : null}
        </div>
        {roadMoney ? (
          <div className="mt-3.5 flex items-center justify-between border-t border-line-soft pt-3 text-meta">
            <span className="text-ink-3">{advancePaid ? fill(o.advancePaid, { amount: naira(roadMoney.advance) }) : o.advanceWhen}</span>
            <span className="tabular font-semibold text-ink">{fill(o.onDelivery, { amount: naira(roadMoney.balance) })}</span>
          </div>
        ) : null}
      </Link>
    </section>
  ) : null;

  const loadsSection = (
    <section>
      <Head
        title={o.loadsForTrucks}
        caps
        action={
          <Link href="/app/haul/loads" className="-my-3 inline-flex min-h-11 items-center text-body-sm font-semibold text-green-700">
            {loads.length > 2 ? fill(o.seeAll, { n: loads.length }) : o.seeAllPlain}
          </Link>
        }
      />
      {loads.length ? (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">
            {loads.slice(0, 2).map((l) => (
              <LoadCard key={l.id} load={l} compact />
            ))}
          </ul>
          <ul className="hidden rounded-card border border-line bg-surface lg:block">
            {loads.slice(0, 3).map((l) => (
              <li key={l.id} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto_auto_auto] items-center gap-4 border-t border-line-soft px-6 py-4 first:border-t-0">
                <span className="text-body font-semibold text-ink">
                  {l.from} → {l.to}
                </span>
                <span className="text-body-sm text-ink-2">
                  {dayLabel(l.pickupFrom).split(" ").slice(0, 2).join(" ")} · {l.truckType.toLowerCase()} · {l.goods.toLowerCase()}
                  {l.weightKg ? `, ${Math.round(l.weightKg / 1000)} t` : ""}
                </span>
                <span>{l.offered ? <StatusChip tone="warning">{o.sendersOffer}</StatusChip> : l.forPlate ? <StatusChip tone="success">{l.forPlate}</StatusChip> : null}</span>
                <span className="tabular text-body font-semibold text-ink">{naira(l.payoutKobo)}</span>
                <Link href={`/app/haul/loads?load=${l.id}`} className={buttonVariants({ size: "sm", variant: l.forPlate && !l.offered ? "primary" : "secondary" })}>
                  {o.open}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="rounded-card border border-line bg-surface px-6 py-8 text-center">
          <p className="text-body font-semibold text-ink">{o.noLoads}</p>
          <p className="mt-1 text-meta text-ink-3">{o.noLoadsText}</p>
        </div>
      )}
    </section>
  );

  const trucksSection = (
    <section>
      <Head
        title={o.yourTrucks}
        caps
        action={
          <Link href="/app/haul/trucks" className="-my-3 inline-flex min-h-11 items-center text-body-sm font-semibold text-green-700">
            {o.manage}
          </Link>
        }
      />
      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:gap-0 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:px-5">
        {trucks.slice(0, 6).map((x) => {
          const pill = truckPill(x, paperFor.get(x.truck_id)?.days ?? null);
          return (
            <li key={x.truck_id}>
              <Link href={`/app/haul/trucks/${x.truck_id}`} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 lg:flex-row lg:items-center lg:gap-3 lg:rounded-none lg:border-0 lg:border-t lg:border-line-soft lg:px-0 lg:py-3.5 lg:first:border-t-0">
                <Truck aria-hidden className="size-6 text-green-900" strokeWidth={1.8} />
                <span className="tabular text-body font-semibold text-ink lg:flex-1">{x.plate.replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3")}</span>
                <span className="self-start lg:self-auto">
                  <StatusChip tone={pill.tone}>{pill.text}</StatusChip>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const record = (
    <Link href="/app/haul/record" className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-4.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-[#FFF4CC] text-[#8A6100]">
        <Star aria-hidden className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">{fill(tripCount === 1 ? o.recordOne : o.record, { tier: o.tier[tier], n: tripCount })}</span>
        <span className="block text-meta text-ink-3">{recordSub}</span>
      </span>
    </Link>
  );

  // Desktop: the trips table under Needs you (OD01).
  const live = trucks.filter((x) => x.trip_id && x.trip_status && LIVE.includes(x.trip_status));
  const nextPayout = new Map<string, string>();
  await Promise.all(
    live.map(async (x) => {
      const { data } = await supabase.rpc("trip_money", { p_trip: x.trip_id as string });
      const m = data?.[0];
      if (!m) return;
      const paidAdvance = (payouts ?? []).some((p) => p.trip_id === x.trip_id && p.kind === "advance" && p.status === "paid");
      nextPayout.set(x.trip_id as string, paidAdvance ? fill(o.onDelivery, { amount: naira(Number(m.balance_kobo)) }) : fill(o.atLoading, { amount: naira(Number(m.advance_kobo)) }));
    }),
  );
  const tripsTable = live.length ? (
    <section className="hidden rounded-card border border-line bg-surface lg:block">
      <div className="flex items-center justify-between px-6 pt-5">
        <h2 className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{o.trips}</h2>
        <Link href="/app/haul/trips" className="text-body-sm font-semibold text-green-700">
          {o.allTrips}
        </Link>
      </div>
      <table className="mt-3 w-full text-left text-body-sm">
        <thead>
          <tr className="border-b border-line-soft text-caption font-semibold tracking-caps text-ink-3 uppercase">
            {[o.cols.truck, o.cols.driver, o.cols.route, o.cols.status, o.cols.load, o.cols.next].map((c) => (
              <th key={c} className="px-6 py-2.5 font-semibold first:pl-6">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {live.map((x) => (
            <tr key={x.trip_id} className="border-t border-line-soft">
              <td className="tabular px-6 py-3.5 font-semibold">
                <Link href={`/app/haul/trips/${x.trip_id}`}>{x.plate.replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3")}</Link>
              </td>
              <td className="px-6 py-3.5">{x.driver_name ?? "—"}</td>
              <td className="px-6 py-3.5">
                {x.from_city} → {x.to_city}
              </td>
              <td className="px-6 py-3.5">
                <StatusChip tone={ROAD.includes(x.trip_status ?? "") ? "info" : "success"}>{messages.trips.status[x.trip_status as keyof typeof messages.trips.status] ?? x.trip_status}</StatusChip>
              </td>
              <td className="px-6 py-3.5 text-ink-2">{x.weight_kg ? `${Math.round((x.weight_kg / x.capacity_kg) * 100)}% · ${Math.round(x.weight_kg / 1000)} t` : (x.goods ?? "")}</td>
              <td className="tabular px-6 py-3.5 text-right">{nextPayout.get(x.trip_id ?? "") ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ) : null;

  return (
    <div className="flex flex-col gap-5">
      {hero}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-5">
          {needsYou}
          {onRoad}
          {tripsTable}
          {loadsSection}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {trucksSection}
          {record}
        </div>
      </div>
    </div>
  );
}
