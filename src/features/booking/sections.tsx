import { UndoToastPreview } from "@/features/trips/undo-preview";
import { dayLabel } from "@/features/checkout/data";
import { type DeskRow, type DraftCard, TripsTabs } from "@/features/checkout/trips-tabs";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { EmptyScene } from "@/components/art/scenes";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { BookFlow } from "./book-flow";
import type { FleetTruck } from "@/features/home/owner-home";
import { LoadCard, toBoardLoad } from "@/features/owner/load-cards";
import { shipperLoads } from "./data";
import { lagosDate, naira, statusOf, TripCard } from "./pieces";
import { loadLine } from "./format";
import { Suspense } from "react";

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

/** P12b cards, and the days a passed draft can move to (computed outside render: they read the clock). */
function draftCards(rows: Awaited<ReturnType<typeof shipperLoads>>) {
  const now = Date.now();
  const today = new Date().toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" });
  const drafts: DraftCard[] = rows.map((r) => {
    const passed = new Date(r.pickupFrom).getTime() < now - 3600_000;
    const created = new Date(r.createdAt);
    const saved =
      created.toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" }) === today
        ? messages.drafts.savedToday.replace("{time}", created.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }))
        : messages.drafts.saved.replace("{date}", created.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }));
    return {
      id: r.id,
      route: `${r.from} → ${r.to}`,
      line: [[r.goods, loadLine(r)].filter(Boolean).join(", "), passed ? messages.drafts.dayNotSet : dayLabel(r.pickupFrom), r.truckType.toLowerCase()].join(" · "),
      saved,
      totalKobo: r.totalKobo,
      dayPassed: passed,
    };
  });
  // Finishing a draft: the next eight days (free counts are shown on the booking screen).
  const days = Array.from({ length: 8 }, (_, i) => ({
    day: new Date(now + (i + 1) * 86400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
    free: -1,
  }));
  return { drafts, days };
}

/** D05 one row of the desktop table and its panel. */
function deskRow(r: Awaited<ReturnType<typeof shipperLoads>>[number]): DeskRow {
  const status = statusOf(r);
  const d = messages.drafts;
  const done = !!r.trip && ["delivered", "delivered_with_exception", "closed"].includes(r.trip.status);
  return {
    id: r.id,
    ref: r.ref,
    route: r.from + " → " + r.to,
    from: r.from,
    to: r.to,
    pickup: dayLabel(r.pickupFrom),
    status: status.label,
    tone: status.tone,
    goods: [r.goods, loadLine(r)].filter(Boolean).join(", "),
    truck: r.truckType,
    paidKobo: r.totalKobo,
    money: r.status === "refunded" || r.status === "cancelled" ? d.refunded : done ? d.released : d.heldSafely,
    driver: r.trip?.driverName ? { name: r.trip.driverName, plate: r.trip.plate } : null,
    live: !!r.trip && !done,
  };
}

/** P12 the line under a trip's route: when it arrives or loads, and who drives. */
function tripNext(row: Awaited<ReturnType<typeof shipperLoads>>[number]) {
  if (row.trip?.deliveredAt) return messages.trips.nextDelivered.replace("{day}", dayLabel(row.trip.deliveredAt));
  if (row.trip) return [messages.trips.nextPickup.replace("{day}", dayLabel(row.pickupFrom)), row.trip.driverName].filter(Boolean).join(" · ");
  return messages.trips.nextPickup.replace("{day}", dayLabel(row.pickupFrom));
}

/** S-03 / P12 Trips: Active, Drafts (D049), Done, Cancelled. */
export async function TripsPage({ viewer, preview }: { viewer: Promise<Viewer>; preview?: string }) {
  const { orgId } = await viewer;
  // ?preview=empty (P12c) shows the empty state for this account; ?preview=undo (P14f) the undo toast,
  // in previews only, so production never shows a cancellation that didn't happen.
  const previews = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const rows = orgId && preview !== "empty" ? await shipperLoads(orgId) : [];
  if (!rows.length) {
    return (
      <Empty
        title={messages.trips.emptyRoad}
        text={messages.trips.emptyRoadText}
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
  const done = (r: (typeof rows)[number]) => !!r.trip && ["delivered", "delivered_with_exception", "closed"].includes(r.trip.status);
  const groups = {
    active: rows.filter((r) => ["funded", "matched"].includes(r.status) && !done(r)),
    drafts: rows.filter((r) => ["draft", "awaiting_payment", "expired"].includes(r.status)),
    done: rows.filter(done),
    cancelled: rows.filter((r) => ["cancelled", "refunded"].includes(r.status)),
  };
  const list = (items: typeof rows) =>
    items.length ? (
      <ul className="flex flex-col gap-3">
        {items.map((row) => (
          <TripCard key={row.id} row={row} href={`/app/ship/trips/${row.id}`} next={tripNext(row)} />
        ))}
      </ul>
    ) : (
      <p className="rounded-card border border-line bg-surface px-6 py-10 text-center text-body-sm text-ink-2">{messages.drafts.emptyTab}</p>
    );
  const { drafts, days } = draftCards(groups.drafts);
  return (
    <>
      {previews && preview === "undo" ? <UndoToastPreview /> : null}
    <Suspense>
      <TripsTabs
        counts={{ active: groups.active.length, drafts: groups.drafts.length, done: groups.done.length, cancelled: groups.cancelled.length }}
        lists={{ active: list(groups.active), done: list(groups.done), cancelled: list(groups.cancelled) }}
        desk={{ active: groups.active.map(deskRow), done: groups.done.map(deskRow), cancelled: groups.cancelled.map(deskRow) }}
        drafts={drafts}
        days={days}
      />
    </Suspense>
    </>
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
  if (!orgId) return <Empty title={messages.loads.empty} text={messages.loads.emptyText} />;
  const supabase = await supabaseServer();
  const [{ data: loads }, { data: fleet }] = await Promise.all([supabase.rpc("load_board", { p_org: orgId }), supabase.rpc("fleet", { p_org: orgId })]);
  if (!loads?.length) return <Empty title={messages.loads.empty} text={messages.loads.emptyText} />;
  const rows = loads.map((l) => toBoardLoad(l, (fleet ?? []) as FleetTruck[]));
  const o = messages.owner;
  return (
    <div className="mx-auto w-full max-w-[880px]">
      <p className="mb-3 px-1 text-meta text-ink-3">{rows.length === 1 ? o.loadsCountOne : o.loadsCount.replace("{n}", String(rows.length))}</p>
      <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {rows.map((l) => (
          <LoadCard key={l.id} load={l} href={`/app/haul/loads/${l.id}`} />
        ))}
      </ul>
    </div>
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
