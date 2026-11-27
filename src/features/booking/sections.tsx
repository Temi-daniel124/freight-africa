import { Receipt } from "lucide-react";
import Link from "next/link";
import { EmptyScene } from "@/components/art/scenes";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { BookFlow } from "./book-flow";
import { shipperLoads } from "./data";
import { LoadBoardList } from "./load-board";
import { lagosDate, naira, TripRow } from "./pieces";

function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-3 rounded-tile bg-surface px-6 py-10 text-center shadow-raised lg:rounded-card">
      <EmptyScene className="max-w-52" />
      <h2 className="text-title-3 text-ink">{title}</h2>
      <p className="max-w-80 text-body-sm text-ink-2">{text}</p>
      {action}
    </section>
  );
}

/** S-02 Book a truck (mockups P08–P09b, D03). */
export async function BookPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId, fullName } = await viewer;
  if (!orgId) return <Empty title={messages.booking.title} text={messages.org.team.noOrg} />;
  const supabase = await supabaseServer();
  const [{ data: cities }, { data: types }, { data: goods }] = await Promise.all([
    supabase.from("cities").select("id, name").eq("is_corridor_hub", true).order("name"),
    supabase.from("truck_types").select("id, name, code, capacity_kg_default").eq("active", true).order("sort_order"),
    supabase.from("goods_categories").select("id, name, code").eq("active", true).eq("is_banned", false).not("parent_id", "is", null).order("sort_order"),
  ]);
  const list = cities ?? [];
  return (
    <BookFlow
      orgId={orgId}
      myName={fullName}
      cities={list}
      truckTypes={(types ?? []).map((x) => ({ id: x.id, name: x.name, code: x.code, capacity: x.capacity_kg_default }))}
      goods={goods ?? []}
      defaultFrom={list.find((c) => c.name === "Lagos")?.id}
      defaultTo={list.find((c) => c.name === "Kano")?.id}
      allowSample={process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"}
    />
  );
}

/** S-03 Trips. */
export async function TripsPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const rows = orgId ? await shipperLoads(orgId) : [];
  if (!rows.length) {
    return (
      <Empty
        title={messages.trips.empty}
        text={messages.trips.emptyText}
        action={
          <Link
            href="/app/ship/book"
            className={buttonVariants({ size: "md" })}
          >
            {messages.trips.book}
          </Link>
        }
      />
    );
  }
  return (
    <ul className="mx-auto w-full max-w-[880px] overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
      {rows.map((row) => (
        <TripRow key={row.id} row={row} href={`/app/ship/trips/${row.id}`} />
      ))}
    </ul>
  );
}

/** S-14 Payments: money in and refunds, each with its receipt. */
export async function PaymentsPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const supabase = await supabaseServer();
  const [{ data: payments }, { data: refunds }] = orgId
    ? await Promise.all([
        supabase
          .from("payments")
          .select(
            "id, amount_kobo, received_kobo, status, received_at, created_at, load:loads(ref, from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name))",
          )
          .eq("shipper_org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("refunds")
          .select(
            "id, amount_kobo, status, reason, paid_at, created_at, load:loads(ref)",
          )
          .eq("shipper_org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(50),
      ])
    : [{ data: [] }, { data: [] }];
  const t = messages.payments;
  if (!payments?.length && !refunds?.length)
    return <Empty title={t.empty} text={t.emptyText} />;
  type L = {
    ref: string;
    from: { name: string } | null;
    to: { name: string } | null;
  } | null;
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5">
      <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
        {(payments ?? []).map((p) => {
          const load = p.load as unknown as L;
          const done = Number(p.received_kobo) >= Number(p.amount_kobo);
          return (
            <li
              key={p.id}
              className="flex min-h-16 items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 lg:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="tabular block text-body-sm font-semibold whitespace-nowrap text-ink">
                  {load?.ref}
                </span>
                <span className="block truncate text-caption font-medium text-ink-3">
                  {load?.from?.name} → {load?.to?.name} ·{" "}
                  {lagosDate.format(new Date(p.received_at ?? p.created_at))}
                </span>
              </span>
              <span className="tabular shrink-0 text-body-sm font-semibold text-ink">
                {naira(Number(p.amount_kobo))}
              </span>
              <StatusChip tone={done ? "success" : "warning"}>
                {done ? t.paid : t.pending}
              </StatusChip>
              {done ? (
                <Link
                  href={`/app/ship/receipts/${p.id}`}
                  aria-label={`${t.receipt} ${load?.ref}`}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-green-700 hover:bg-paper"
                >
                  <Receipt aria-hidden className="size-5" strokeWidth={1.75} />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      {refunds?.length ? (
        <section>
          <h2 className="mb-3 text-body-lg font-semibold text-ink">
            {t.refunds}
          </h2>
          <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
            {refunds.map((r) => (
              <li
                key={r.id}
                className="flex min-h-16 items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 lg:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="tabular block text-body-sm font-semibold whitespace-nowrap text-ink">
                    {(r.load as unknown as { ref: string } | null)?.ref}
                  </span>
                  <span className="block truncate text-caption font-medium text-ink-3">
                    {r.reason}
                  </span>
                </span>
                <span className="tabular shrink-0 text-body-sm font-semibold text-ink">
                  {naira(Number(r.amount_kobo))}
                </span>
                <StatusChip tone={r.status === "paid" ? "success" : "info"}>
                  {r.status === "paid" ? t.refunded : t.pending}
                </StatusChip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** T-04 Loads for your trucks. */
export async function LoadsPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  if (!orgId)
    return (
      <Empty title={messages.loads.empty} text={messages.loads.emptyText} />
    );
  const supabase = await supabaseServer();
  const [{ data: loads }, { data: trucks }, { data: drivers }] =
    await Promise.all([
      supabase.rpc("load_board", { p_org: orgId }),
      supabase
        .from("trucks")
        .select(
          "id, plate_number, capacity_kg, truck_type_id, default_driver_id, status, availability",
        )
        .eq("org_id", orgId)
        .eq("status", "active"),
      supabase.rpc("team_members", { p_org: orgId }),
    ]);
  if (!loads?.length)
    return (
      <Empty title={messages.loads.empty} text={messages.loads.emptyText} />
    );
  return (
    <LoadBoardList
      loads={loads.map((l) => ({
        id: l.load_id,
        ref: l.ref,
        from: l.from_city,
        to: l.to_city,
        goods: l.goods,
        weightKg: l.weight_kg,
        quantity: l.quantity,
        unit: l.quantity_unit,
        truckType: l.truck_type,
        truckTypeId: l.truck_type_id,
        pickup: lagosDate.format(new Date(l.pickup_from)),
        freight: Number(l.freight_kobo),
        payout: Number(l.payout_kobo),
        band: l.value_band,
      }))}
      trucks={(trucks ?? [])
        .filter((x) => x.availability !== "on_trip")
        .map((x) => ({
          id: x.id,
          plate: x.plate_number,
          capacity: x.capacity_kg,
          typeId: x.truck_type_id,
          driver: x.default_driver_id,
        }))}
      drivers={(drivers ?? [])
        .filter((d) => d.is_driver && d.status === "active")
        .map((d) => ({
          id: d.user_id,
          name: d.is_me ? messages.loads.meDriving : (d.full_name ?? ""),
        }))}
    />
  );
}

/** T-15 Earnings: payouts by trip (owners and admins; drivers never, D003). */
export async function EarningsPage({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const t = messages.earnings;
  const supabase = await supabaseServer();
  const { data: payouts } = orgId
    ? await supabase
        .from("payouts")
        .select(
          "id, kind, amount_kobo, status, paid_at, created_at, trip:trips(id, ref)",
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };
  if (!payouts?.length) return <Empty title={t.empty} text={t.emptyText} />;
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const month = payouts
    .filter((p) => new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount_kobo), 0);
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5">
      <section className="rounded-tile bg-green-900 p-5 text-white shadow-raised lg:rounded-card lg:p-6">
        <p className="text-body-sm text-white/75">{t.month}</p>
        <p className="tabular text-[32px] leading-10 font-semibold">
          {naira(month)}
        </p>
      </section>
      <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
        {payouts.map((p) => {
          const trip = p.trip as unknown as { id: string; ref: string } | null;
          return (
            <li key={p.id}>
              <Link
                href={trip ? `/app/haul/trips/${trip.id}` : "#"}
                className="flex min-h-16 items-center gap-3 border-t border-line px-4 py-3 hover:bg-paper lg:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-semibold text-ink">
                    {t[p.kind as "advance"] ?? p.kind}
                  </span>
                  <span className="tabular block truncate text-caption font-medium whitespace-nowrap text-ink-3">
                    {trip?.ref} ·{" "}
                    {lagosDate.format(new Date(p.paid_at ?? p.created_at))}
                  </span>
                </span>
                <span className="tabular shrink-0 text-body-sm font-semibold text-ink">
                  {naira(Number(p.amount_kobo))}
                </span>
                <StatusChip tone={p.status === "paid" ? "success" : "info"}>
                  {t[p.status as "paid"] ?? p.status}
                </StatusChip>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
