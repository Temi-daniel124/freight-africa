import Link from "next/link";
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
    ? await supabase
        .from("trips")
        .select(OWNER_TRIP_SELECT)
        .eq("transporter_org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50)
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
  return (
    <ul className="mx-auto w-full max-w-[880px] overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/app/haul/trips/${r.id}`}
            className="flex min-h-18 items-center gap-3 border-t border-line px-4 py-3 hover:bg-paper lg:px-5"
          >
            <span className="min-w-0 flex-1">
              <span className="tabular block text-body-sm font-bold whitespace-nowrap text-ink">
                {r.ref}
              </span>
              <span className="block truncate text-caption font-medium whitespace-nowrap text-ink-3">
                {r.load?.from?.name} → {r.load?.to?.name} ·{" "}
                {r.truck?.plate_number}
              </span>
            </span>
            <StatusChip
              tone={
                r.status === "closed"
                  ? "success"
                  : r.status === "cancelled"
                    ? "danger"
                    : "info"
              }
            >
              {t.status[r.status as keyof typeof t.status] ?? r.status}
            </StatusChip>
          </Link>
        </li>
      ))}
    </ul>
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
            <h1 className="tabular text-title-2 font-extrabold whitespace-nowrap text-ink">
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
