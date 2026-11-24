import Link from "next/link";
import { notFound } from "next/navigation";
import { TruckGraphic, truckKind } from "@/components/art/truck";
import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/chip";
import { lagosDate, naira, ProgressDots } from "@/features/booking/pieces";
import { progressStep } from "@/features/booking/data";
import {
  fleetLoad,
  truckState,
  type FleetTruck,
} from "@/features/home/owner-home";
import { avatarSrc } from "@/features/settings/avatars";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { TruckControls } from "./truck-controls";

const t = messages.truckDetail;

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card">
      <h2 className="text-title-3 text-ink">{title}</h2>
      {children}
    </section>
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
    <div className="flex justify-between gap-4 py-2.5 text-body-sm">
      <dt className="shrink-0 text-ink-2">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}

/** Truck detail (D045): a full page on phones; the same cards in two columns on desktop. */
export async function TruckDetail({
  id,
  orgId,
}: {
  id: string;
  orgId: string | null;
}) {
  if (!orgId) notFound();
  const supabase = await supabaseServer();
  const [{ data: fleet }, { data: papers }, { data: history }, { data: team }] =
    await Promise.all([
      supabase.rpc("fleet", { p_org: orgId }),
      supabase
        .from("documents")
        .select("id, status, expires_on, type:document_types(name)")
        .eq("subject_kind", "truck")
        .eq("subject_id", id)
        .order("expires_on"),
      supabase
        .from("trips")
        .select(
          "id, ref, status, created_at, load:loads(from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name), goods:goods_categories(name)), driver:profiles(full_name)",
        )
        .eq("truck_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.rpc("team_members", { p_org: orgId }),
    ]);
  const x = ((fleet ?? []) as unknown as FleetTruck[]).find(
    (row) => row.truck_id === id,
  );
  if (!x) notFound();
  const state = truckState(x);
  const trips = (history ?? []) as unknown as {
    id: string;
    ref: string;
    status: string;
    created_at: string;
    load: {
      from: { name: string } | null;
      to: { name: string } | null;
      goods: { name: string } | null;
    } | null;
    driver: { full_name: string | null } | null;
  }[];
  const earned = new Map<string, number>();
  if (trips.length) {
    const { data: payouts } = await supabase
      .from("payouts")
      .select("trip_id, amount_kobo")
      .in(
        "trip_id",
        trips.map((r) => r.id),
      );
    for (const p of payouts ?? [])
      earned.set(
        p.trip_id ?? "",
        (earned.get(p.trip_id ?? "") ?? 0) + Number(p.amount_kobo),
      );
  }
  const { data: money } = x.trip_id
    ? await supabase.rpc("trip_money", { p_trip: x.trip_id })
    : { data: null };
  const drivers = (team ?? [])
    .filter((m) => m.is_driver && m.status === "active")
    .map((m) => ({ id: m.user_id, name: m.full_name ?? "" }));
  const driver = (team ?? []).find((m) => m.full_name === x.driver_name);
  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-5">
        <section className="flex flex-col gap-4 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="tabular text-title-2 font-extrabold whitespace-nowrap text-ink">
                {x.plate}
              </h1>
              <p className="truncate text-body-sm text-ink-2">{x.truck_type}</p>
            </div>
            <StatusChip tone={state.tone}>
              {messages.home2.truckState[state.key]}
            </StatusChip>
          </div>
          <TruckGraphic
            kind={truckKind(x.truck_type_code)}
            load={fleetLoad(x)}
          />
          <TruckControls
            truckId={x.truck_id}
            paused={x.status === "paused"}
            onTrip={!!x.trip_id}
            drivers={drivers}
          />
        </section>
        {x.trip_id ? (
          <Card title={t.currentTrip}>
            <Link
              href={`/app/haul/trips/${x.trip_id}`}
              className="tabular text-body font-bold text-green-700"
            >
              {x.trip_ref}
            </Link>
            <ProgressDots step={progressStep("matched", x.trip_status)} />
            <dl className="divide-y divide-line">
              <Line label={messages.trips.route}>
                {x.from_city} → {x.to_city}
              </Line>
              <Line label={messages.trips.goods}>
                {[
                  x.goods,
                  fleetLoad(x)?.kind === "weight"
                    ? `${(x.weight_kg ?? 0) / 1000} t`
                    : x.quantity
                      ? `${x.quantity} ${x.quantity_unit}`
                      : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Line>
              {money?.[0] ? (
                <Line label={t.pays}>
                  {naira(
                    Number(money[0].freight_kobo) -
                      Number(money[0].commission_kobo),
                  )}
                </Line>
              ) : null}
            </dl>
          </Card>
        ) : null}
        <Card title={t.history}>
          {trips.length ? (
            <ul className="divide-y divide-line">
              {trips.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/haul/trips/${r.id}`}
                    className="flex min-h-14 items-center gap-3 py-2.5 hover:bg-paper"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold whitespace-nowrap text-ink">
                        {r.load?.from?.name} → {r.load?.to?.name}
                      </span>
                      <span className="block truncate text-caption text-ink-3">
                        {lagosDate.format(new Date(r.created_at))} ·{" "}
                        {r.load?.goods?.name} · {r.driver?.full_name ?? "—"}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-body-sm font-bold text-ink">
                      {earned.get(r.id) ? naira(earned.get(r.id) ?? 0) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-ink-2">{t.noTrips}</p>
          )}
        </Card>
      </div>
      <aside className="flex flex-col gap-5 self-start">
        <Card title={t.driver}>
          {x.driver_name ? (
            <div className="flex items-center gap-3">
              <Avatar
                name={x.driver_name}
                src={avatarSrc(x.driver_avatar)}
                size={48}
              />
              <div className="min-w-0">
                <p className="truncate text-body font-bold text-ink">
                  {x.driver_name}
                </p>
                <p className="tabular truncate text-caption text-ink-3">
                  {driver?.phone ?? ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-body-sm text-ink-2">{messages.home2.noDriver}</p>
          )}
        </Card>
        <Card title={t.papers}>
          {papers?.length ? (
            <dl className="divide-y divide-line">
              {papers.map((p) => (
                <Line
                  key={p.id}
                  label={
                    (p.type as unknown as { name: string } | null)?.name ?? ""
                  }
                >
                  {p.expires_on
                    ? lagosDate.format(new Date(p.expires_on))
                    : messages.trucks.list.status.pending_review}
                </Line>
              ))}
            </dl>
          ) : (
            <p className="text-body-sm text-ink-2">{t.noPapers}</p>
          )}
        </Card>
      </aside>
    </div>
  );
}
