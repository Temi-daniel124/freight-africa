import Link from "next/link";
import { Suspense } from "react";
import { PillTabs } from "@/features/account/account-client";
import { dayLabel } from "@/features/checkout/data";
import { slotOf } from "@/features/owner/load-cards";
import { cn } from "@/lib/utils";

import { notFound } from "next/navigation";
import { EmptyScene } from "@/components/art/scenes";
import { fillPercent, TruckGraphic, truckKind } from "@/components/art/truck";
import { StatusChip } from "@/components/ui/chip";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { progressStep } from "./data";
import { lagosTime, naira, ProgressDots } from "./pieces";
import { DemoTripSteps } from "./trip-controls";

const t = messages.trips;

export type OwnerTrip = {
  id: string;
  ref: string;
  status: string;
  created_at: string;
  loaded_at: string | null;
  delivered_at: string | null;
  load: {
    status: string;
    weight_kg: number | null;
    quantity: number | null;
    quantity_unit: string | null;
    pickup_from: string;
    is_demo: boolean;
    from: { name: string } | null;
    to: { name: string } | null;
    goods: { name: string } | null;
    shipper: { name: string } | null;
  } | null;
  truck: {
    id: string;
    plate_number: string;
    capacity_kg: number;
    truck_type: { name: string; code: string } | null;
  } | null;
  driver: { full_name: string | null; avatar_key: string | null } | null;
};

export const OWNER_TRIP_SELECT =
  "id, ref, status, created_at, loaded_at, delivered_at, load:loads(status, weight_kg, quantity, quantity_unit, pickup_from, is_demo, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), goods:goods_categories(name), shipper:organizations(name)), truck:trucks(id, plate_number, capacity_kg, truck_type:truck_types(name, code)), driver:profiles(full_name, avatar_key)";

/** D046 load display for a trip's truck. */
export function tripFill(r: OwnerTrip) {
  const cap = r.truck?.capacity_kg ?? 30000;
  const load = r.load;
  if (load?.weight_kg)
    return {
      kind: "weight" as const,
      percent: fillPercent(load.weight_kg, cap),
      line: `${load.weight_kg / 1000} t of ${cap / 1000} t`,
    };
  if (load?.quantity_unit === "head")
    return {
      kind: "livestock" as const,
      text: `${load.goods?.name.split(",")[0]} · ${load.quantity} head`,
    };
  return {
    kind: "amount" as const,
    goods: load?.goods?.name ?? "",
    amount: load?.quantity
      ? `about ${load.quantity} ${load.quantity_unit}`
      : undefined,
  };
}

/** T-07 Trips for a truck business. */
export async function OwnerTripsPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const supabase = await supabaseServer();
  const { data } = orgId
    ? await supabase.from("trips").select(OWNER_TRIP_SELECT).eq("transporter_org_id", orgId).order("created_at", { ascending: false }).limit(50)
    : { data: [] };
  const rows = (data ?? []) as unknown as OwnerTrip[];
  if (!rows.length) {
    return (
      <section className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-3 rounded-tile bg-surface px-6 py-10 text-center shadow-raised lg:rounded-card">
        <EmptyScene className="max-w-52" />
        <h2 className="text-title-3 text-ink">{t.empty}</h2>
      </section>
    );
  }
  // O14: what the owner gets on each trip (drivers never reach this page, D003).
  const money = new Map<string, { advance: number; balance: number }>();
  const [{ data: paid }] = await Promise.all([
    supabase.from("payouts").select("trip_id, kind, status").in("trip_id", rows.map((r) => r.id)),
    ...rows.slice(0, 30).map(async (r) => {
      const { data: m } = await supabase.rpc("trip_money", { p_trip: r.id });
      if (m?.[0]) money.set(r.id, { advance: Number(m[0].advance_kobo), balance: Number(m[0].balance_kobo) });
      return { data: null };
    }),
  ]);
  const o = messages.owner;
  const advanceDone = (id: string) => (paid ?? []).some((p) => p.trip_id === id && p.kind === "advance" && p.status === "paid");
  const group = (r: OwnerTrip) =>
    ["loaded", "in_transit", "arrived", "at_pickup", "loading"].includes(r.status)
      ? "active"
      : ["assigned", "to_pickup"].includes(r.status)
        ? "upcoming"
        : r.status === "cancelled"
          ? "cancelled"
          : "done";
  const card = (r: OwnerTrip) => {
    const m = money.get(r.id);
    const g = group(r);
    const fillLine = r.load?.weight_kg && r.truck ? `${Math.round((r.load.weight_kg / r.truck.capacity_kg) * 100)}% full` : null;
    const when = r.load ? `${o.loadsOn.replace("{day}", dayLabel(r.load.pickup_from))}, ${slotOf(r.load.pickup_from)}` : "";
    return (
      <li key={r.id}>
        <Link href={`/app/haul/trips/${r.id}`} className="block rounded-card border border-line bg-surface px-5 pt-4.5 pb-4 hover:border-green-700/40">
          <div className="flex items-center justify-between gap-3">
            <p className="tabular truncate text-caption font-semibold tracking-caps text-ink-3 uppercase">
              {r.ref.replace(/-T\d+$/, "")} · {r.truck?.plate_number}
            </p>
            <StatusChip tone={g === "active" ? "info" : g === "upcoming" ? "success" : g === "cancelled" ? "danger" : "success"}>
              {g === "upcoming" ? o.upcoming : (messages.trips.status[r.status as keyof typeof messages.trips.status] ?? r.status)}
            </StatusChip>
          </div>
          <p className="mt-1.5 text-title-3 text-ink">
            {r.load?.from?.name} → {r.load?.to?.name}
          </p>
          <p className="truncate text-meta text-ink-3">{[r.driver?.full_name, g === "upcoming" ? when : null, fillLine].filter(Boolean).join(" · ")}</p>
          {m && g !== "cancelled" ? (
            <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-meta">
              <span className="text-ink-3">{g === "done" ? o.paidDone : advanceDone(r.id) ? o.advancePaid.replace("{amount}", "").trim() : o.advanceAtLoading}</span>
              <span className="tabular font-semibold text-ink">
                {g === "done" ? naira(m.advance + m.balance) : advanceDone(r.id) ? o.onDelivery.replace("{amount}", naira(m.balance)) : naira(m.advance)}
              </span>
            </div>
          ) : null}
        </Link>
      </li>
    );
  };
  const keys = ["active", "upcoming", "done", "cancelled"] as const;
  const counts = Object.fromEntries(keys.map((k) => [k, rows.filter((r) => group(r) === k).length])) as Record<(typeof keys)[number], number>;
  const panel = (k: (typeof keys)[number]) => {
    const list = rows.filter((r) => group(r) === k);
    if (!list.length) return <p className="rounded-card border border-line bg-surface px-6 py-10 text-center text-body-sm text-ink-2">{o.noTrips}</p>;
    return (
      <>
        <ul className="flex flex-col gap-3 lg:hidden">{list.map(card)}</ul>
        <table className="hidden w-full overflow-hidden rounded-card border border-line bg-surface text-left text-body-sm lg:table">
          <thead className="bg-paper/60">
            <tr className="text-caption font-semibold tracking-caps text-ink-3 uppercase">
              {[o.cols.truck, o.cols.driver, o.cols.route, o.cols.status, o.cols.load, o.cols.next].map((c, i) => (
                <th key={c} className={cn("px-5 py-3 font-semibold", i === 5 && "text-right")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const m = money.get(r.id);
              return (
                <tr key={r.id} className="border-t border-line-soft hover:bg-paper">
                  <td className="tabular px-5 py-4 font-semibold">
                    <Link href={`/app/haul/trips/${r.id}`}>{r.truck?.plate_number}</Link>
                  </td>
                  <td className="px-5 py-4">{r.driver?.full_name ?? "—"}</td>
                  <td className="px-5 py-4">
                    {r.load?.from?.name} → {r.load?.to?.name}
                  </td>
                  <td className="px-5 py-4">
                    <StatusChip tone={group(r) === "active" ? "info" : "success"}>{messages.trips.status[r.status as keyof typeof messages.trips.status] ?? r.status}</StatusChip>
                  </td>
                  <td className="px-5 py-4 text-ink-2">{r.load?.weight_kg && r.truck ? `${Math.round((r.load.weight_kg / r.truck.capacity_kg) * 100)}% · ${Math.round(r.load.weight_kg / 1000)} t` : (r.load?.goods?.name ?? "")}</td>
                  <td className="tabular px-5 py-4 text-right">
                    {m ? (advanceDone(r.id) ? o.onDelivery.replace("{amount}", naira(m.balance)) : o.atLoading.replace("{amount}", naira(m.advance))) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  };
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <Suspense>
        <PillTabs
          tabs={keys.map((k) => ({ key: k, label: counts[k] && (k === "active" || k === "upcoming") ? `${o.tabs[k]} · ${counts[k]}` : o.tabs[k] }))}
          panels={{ active: panel("active"), upcoming: panel("upcoming"), done: panel("done"), cancelled: panel("cancelled") }}
        />
      </Suspense>
    </div>
  );
}

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-ink-2">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}

/** T-08 one trip for the owner: the truck and its load, route, driver, sender, and what it pays (owners and admins only). */
export async function OwnerTripPage({ id }: { id: string }) {
  const supabase = await supabaseServer();
  const [{ data }, { data: money }] = await Promise.all([
    supabase.from("trips").select(OWNER_TRIP_SELECT).eq("id", id).maybeSingle(),
    supabase.rpc("trip_money", { p_trip: id }),
  ]);
  if (!data) notFound();
  const r = data as unknown as OwnerTrip;
  const m = money?.[0];
  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="tabular text-title-2 font-semibold whitespace-nowrap text-ink">
              {r.ref}
            </h1>
            <p className="truncate text-body-sm whitespace-nowrap text-ink-2">
              {r.load?.from?.name} → {r.load?.to?.name}
            </p>
          </div>
          <StatusChip tone={r.status === "closed" ? "success" : "info"}>
            {t.status[r.status as keyof typeof t.status] ?? r.status}
          </StatusChip>
        </div>
        <TruckGraphic
          kind={truckKind(r.truck?.truck_type?.code ?? "")}
          load={tripFill(r)}
          className="my-4"
        />
        <ProgressDots step={progressStep(r.load?.status ?? "", r.status)} />
        <dl className="mt-4 divide-y divide-line text-body-sm">
          <Line label={t.truck}>
            {r.truck?.plate_number} · {r.truck?.truck_type?.name}
          </Line>
          <Line label={messages.shell.roles.driver}>
            {r.driver?.full_name ?? "—"}
          </Line>
          <Line label={t.dates}>
            {r.load ? lagosTime.format(new Date(r.load.pickup_from)) : "—"}
          </Line>
          <Line label={messages.shell.roles.shipper}>
            {r.load?.shipper?.name ?? "—"}
          </Line>
        </dl>
      </section>
      <aside className="flex flex-col gap-5 self-start">
        {m ? (
          <section className="rounded-tile bg-surface p-5 shadow-raised lg:rounded-card">
            <h2 className="mb-2 text-title-3 text-ink">
              {messages.earnings.title}
            </h2>
            <dl className="divide-y divide-line text-body-sm">
              <Line label={messages.booking.freight}>
                {naira(Number(m.freight_kobo))}
              </Line>
              <Line label={messages.earnings.advance}>
                {naira(Number(m.advance_kobo))}
              </Line>
              <Line label={messages.earnings.balance}>
                {naira(Number(m.balance_kobo))}
              </Line>
            </dl>
          </section>
        ) : null}
        {r.load?.is_demo ? (
          <DemoTripSteps tripId={r.id} status={r.status} />
        ) : null}
      </aside>
    </div>
  );
}
