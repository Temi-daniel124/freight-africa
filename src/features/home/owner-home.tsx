import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { fillPercent, TruckGraphic, truckKind, type TruckLoad } from "@/components/art/truck";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { naira } from "@/features/booking/pieces";
import { avatarSrc } from "@/features/settings/avatars";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { FleetChips } from "./fleet-chips";
import { FleetMapCard } from "./fleet-map-card";

const t = messages.home2;

/** A Lagos date n days from now, as YYYY-MM-DD (papers expiring soon). */
function inDays(n: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(Date.now() + n * 86400000));
}

export type FleetTruck = {
  truck_id: string; plate: string; truck_type: string; truck_type_code: string; capacity_kg: number; status: string; availability: string;
  driver_name: string | null; driver_avatar: string | null; trip_id: string | null; trip_ref: string | null; trip_status: string | null;
  from_city: string | null; to_city: string | null; goods: string | null; weight_kg: number | null; quantity: number | null; quantity_unit: string | null;
  lat: number | null; lng: number | null;
};

export function truckState(x: FleetTruck): { key: "onTrip" | "ready" | "paused" | "review"; tone: StatusTone } {
  if (x.trip_id) return { key: "onTrip", tone: "info" };
  if (x.status === "active" && x.availability !== "unavailable") return { key: "ready", tone: "success" };
  if (x.status === "pending_review" || x.status === "draft") return { key: "review", tone: "warning" };
  return { key: "paused", tone: "neutral" };
}

export function fleetLoad(x: FleetTruck): TruckLoad {
  if (!x.trip_id) return null;
  if (x.weight_kg) return { kind: "weight", percent: fillPercent(x.weight_kg, x.capacity_kg), line: `${x.weight_kg / 1000} t of ${x.capacity_kg / 1000} t` };
  if (x.quantity_unit === "head") return { kind: "livestock", text: `${(x.goods ?? "").split(",")[0]} · ${x.quantity} head` };
  return { kind: "amount", goods: x.goods ?? "", amount: x.quantity ? `about ${x.quantity} ${x.quantity_unit}` : undefined };
}

export function TruckCard({ x }: { x: FleetTruck }) {
  const state = truckState(x);
  return (
    <Link href={`/app/haul/trucks/${x.truck_id}`} className="flex min-w-0 flex-col gap-3 rounded-tile bg-surface p-4 shadow-raised transition-transform active:scale-press lg:rounded-card">
      <TruckGraphic kind={truckKind(x.truck_type_code)} load={fleetLoad(x)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="tabular text-body font-extrabold whitespace-nowrap text-ink">{x.plate}</p>
          <p className="truncate text-caption text-ink-3">{x.truck_type}</p>
        </div>
        <StatusChip tone={state.tone}>{t.truckState[state.key]}</StatusChip>
      </div>
      <div className="flex items-center gap-2">
        <Avatar name={x.driver_name ?? "?"} src={avatarSrc(x.driver_avatar)} size={28} />
        <span className="min-w-0 flex-1 truncate text-body-sm text-ink-2">{x.driver_name ?? t.noDriver}</span>
        {x.from_city ? (
          <span className="shrink-0 text-caption font-semibold whitespace-nowrap text-ink-3">
            {x.from_city} → {x.to_city}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body-lg font-extrabold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Truck owner Home (D045): one design that adapts to fleet size. */
export async function OwnerHome({ viewer, drives }: { viewer: Promise<Viewer>; drives: boolean }) {
  const { orgId } = await viewer;
  if (!orgId) return null;
  const supabase = await supabaseServer();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data: fleet }, { data: loads }, { data: payouts }, { data: papers }] = await Promise.all([
    supabase.rpc("fleet" as never, { p_org: orgId } as never),
    supabase.rpc("load_board", { p_org: orgId }),
    supabase.from("payouts").select("amount_kobo").eq("org_id", orgId).gte("created_at", monthStart),
    supabase.from("documents").select("id, expires_on, subject_kind").eq("subject_kind", "truck").lte("expires_on", inDays(30)).eq("status", "approved"),
  ]);
  const trucks = (fleet ?? []) as unknown as FleetTruck[];
  const onTrip = trucks.filter((x) => x.trip_id);
  const earnings = (payouts ?? []).reduce((sum, p) => sum + Number(p.amount_kobo), 0);
  const needs = [
    ...onTrip.filter((x) => !x.driver_name).map((x) => ({ href: `/app/haul/trips/${x.trip_id}`, text: t.assignDriver.replace("{plate}", x.plate) })),
    ...(papers ?? []).slice(0, 3).map((p) => ({ href: "/app/haul/documents", text: t.paperExpiring.replace("{date}", p.expires_on ?? "") })),
  ];
  const loadRows = (loads ?? []).slice(0, 3);
  const single = drives && trucks.length <= 1;

  const needsYou = needs.length ? (
    <Section title={t.needsYou}>
      <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
        {needs.map((n) => (
          <li key={n.href + n.text}>
            <Link href={n.href} className="flex min-h-14 items-center gap-3 border-t border-line px-4 py-3 text-body-sm first:border-t-0 hover:bg-paper">
              <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
              <span className="min-w-0 flex-1 text-ink-2">{n.text}</span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  ) : null;

  const loadList = (
    <Section
      title={t.loadsForTrucks}
      action={
        <Link href="/app/haul/loads" className="inline-flex min-h-11 items-center text-body-sm font-semibold text-green-700">
          {t.seeAll}
        </Link>
      }
    >
      {loadRows.length ? (
        <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
          {loadRows.map((l) => (
            <li key={l.load_id}>
              <Link href="/app/haul/loads" className="flex min-h-14 items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-paper">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-bold whitespace-nowrap text-ink">
                    {l.from_city} → {l.to_city}
                  </span>
                  <span className="block truncate text-caption text-ink-3">
                    {l.goods} · {l.truck_type}
                  </span>
                </span>
                <span className="tabular shrink-0 text-body-sm font-extrabold text-green-900">{naira(Number(l.payout_kobo))}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-tile bg-surface p-5 text-body-sm text-ink-2 shadow-raised">{messages.loads.emptyText}</p>
      )}
    </Section>
  );

  if (single) {
    return (
      <div className="flex flex-col gap-6 lg:max-w-[880px]">
        {trucks[0] ? (
          <Section title={t.yourTruck}>
            <TruckCard x={trucks[0]} />
          </Section>
        ) : null}
        {needsYou}
        {loadList}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FleetChips counts={{ all: trucks.length, onTrip: onTrip.length, ready: trucks.filter((x) => truckState(x).key === "ready").length, paused: trucks.filter((x) => ["paused", "review"].includes(truckState(x).key)).length }} />
      <FleetMapCard trucks={onTrip.filter((x) => x.lat !== null).map((x) => ({ lat: x.lat as number, lng: x.lng as number, label: x.plate }))} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Section title={t.yourTrucks}>
          <div className="grid gap-3 sm:grid-cols-2" data-fleet-grid>
            {trucks.map((x) => (
              <div key={x.truck_id} data-state={truckState(x).key}>
                <TruckCard x={x} />
              </div>
            ))}
          </div>
        </Section>
        <div className="flex min-w-0 flex-col gap-6">
          {needsYou}
          <Section title={messages.earnings.month}>
            <Link href="/app/haul/earnings" className="block rounded-tile bg-green-900 p-5 text-white shadow-raised lg:rounded-card">
              <p className="tabular text-[28px] leading-9 font-extrabold">{naira(earnings)}</p>
            </Link>
          </Section>
          {loadList}
        </div>
      </div>
    </div>
  );
}
