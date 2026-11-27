import { ArrowRight, Clock, Search } from "lucide-react";
import Link from "next/link";
import { Box } from "@/components/art/pieces";
import { TruckGraphic } from "@/components/art/truck";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { shipperLoads, type LoadRow } from "@/features/booking/data";
import { loadLine, progressStep } from "@/features/booking/format";
import { naira, ProgressDots, statusOf, TripRow } from "@/features/booking/pieces";
import { dayLabel } from "@/features/checkout/data";
import type { Viewer } from "@/features/shell/viewer";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// P07 / D02 sender Home: search, Book a truck and Track a trip, Needs you (a draft to pay), the current
// trip, recent trips (a table on desktop).

const t = messages.home2;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived"];
const UNPAID = ["draft", "awaiting_payment", "expired"];

function Search_() {
  return (
    <form action="/app/ship/track" className="relative lg:w-80">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
      <label htmlFor="home-search" className="sr-only">
        {t.search}
      </label>
      <input
        id="home-search"
        name="ref"
        placeholder={t.search}
        className="h-12 w-full min-w-0 rounded-pill border border-line bg-surface pr-4 pl-11 text-body text-ink outline-none placeholder:text-ink-3 focus:border-green-700 focus:shadow-focus"
      />
    </form>
  );
}

/** P07 phone tiles: Book a truck (deep green) and Track a trip. */
function PhoneTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:hidden">
      <Link href="/app/ship/book" className="relative flex h-39 flex-col overflow-hidden rounded-card bg-green-900 p-4 text-white shadow-raised active:scale-press">
        <span className="max-w-[8ch] text-title-3 leading-tight font-semibold">{t.book}</span>
        <span className="mt-2.5 grid size-8 place-items-center rounded-full bg-white/15">
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
        </span>
        <span aria-hidden className="absolute -right-4 -bottom-2 w-[62%]">
          <TruckGraphic kind="covered" load={null} />
        </span>
      </Link>
      <Link href="/app/ship/track" className="relative flex h-39 flex-col overflow-hidden rounded-card border border-line bg-surface p-4 active:scale-press">
        <span className="max-w-[8ch] text-title-3 leading-tight font-semibold text-ink">{t.track}</span>
        <span className="mt-2.5 grid size-8 place-items-center rounded-full bg-green-50 text-green-700">
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
        </span>
        <span aria-hidden className="absolute -right-3 -bottom-2 w-[52%]">
          <svg viewBox="-80 -140 160 160" className="w-full">
            <Box s={1} />
          </svg>
        </span>
      </Link>
    </div>
  );
}

/** D02 desktop: Book a truck and Track a trip stacked beside the current trip. */
function DeskTiles({ example }: { example: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/app/ship/book" className="relative flex h-27 flex-col justify-center overflow-hidden rounded-card bg-green-900 px-6 text-white hover:bg-green-800">
        <span className="text-title-2 font-semibold">{t.book}</span>
        <span className="text-body-sm text-white/75">{t.bookSub}</span>
        <span aria-hidden className="absolute -right-2 bottom-0 w-40">
          <TruckGraphic kind="covered" load={null} />
        </span>
      </Link>
      <Link href="/app/ship/track" className="relative flex h-27 flex-col justify-center overflow-hidden rounded-card border border-line bg-surface px-6 hover:border-green-700">
        <span className="text-title-2 font-semibold text-ink">{t.track}</span>
        <span className="text-body-sm text-ink-2">{fill(t.trackSub, { ref: example })}</span>
        <span aria-hidden className="absolute right-2 -bottom-2 w-24">
          <svg viewBox="-80 -140 160 160" className="w-full">
            <Box s={1} />
          </svg>
        </span>
      </Link>
    </div>
  );
}

function CurrentCard({ row }: { row: LoadRow }) {
  const status = statusOf(row);
  const step = progressStep(row.status, row.trip?.status);
  const href = row.trip ? `/app/ship/trips/${row.id}/track` : `/app/ship/trips/${row.id}`;
  const goods = [row.goods, loadLine(row)].filter(Boolean).join(", ");
  const end = row.trip?.deliveredAt ? dayLabel(row.trip.deliveredAt) : null;
  return (
    <>
      {/* phone (P07) */}
      <Link href={href} className="block rounded-card border border-line bg-surface p-4.5 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-caption font-semibold tracking-caps text-ink-3 uppercase">
            {row.ref} · {goods}
          </p>
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
        </div>
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption text-ink-3">{dayLabel(row.pickupFrom)}</p>
            <p className="truncate text-title-2 text-ink">{row.from}</p>
          </div>
          <div className="min-w-0 text-right">
            {end ? <p className="text-caption text-ink-3">{end}</p> : null}
            <p className="truncate text-title-2 text-ink">{row.to}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressDots step={step} />
        </div>
      </Link>
      {/* desktop (D02) */}
      <section className="hidden rounded-card border border-line bg-surface px-6 pt-6 pb-5 lg:block">
        <div className="flex items-center justify-between">
          <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{fill(t.currentRef, { ref: row.ref })}</p>
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-meta text-ink-3">
              {row.from} · {dayLabel(row.pickupFrom)}
            </p>
            <p className="truncate text-title-1 text-ink">{row.from}</p>
          </div>
          <span aria-hidden className="mb-3 h-px flex-1 border-t-2 border-dashed border-line-strong" />
          <div className="min-w-0 text-right">
            <p className="text-meta text-ink-3">
              {row.to}
              {end ? ` · ${end}` : ""}
            </p>
            <p className="truncate text-title-1 text-ink">{row.to}</p>
          </div>
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1.5">
          {[messages.trips.progress.booked, messages.trips.progress.loaded, messages.trips.progress.road, messages.trips.progress.delivered].map((label, i) => (
            <li key={label} className={cn("text-meta", i === 3 ? "text-right" : i === 0 ? "" : "text-center", i === step ? "font-semibold text-green-800" : "text-ink-2")}>
              <span aria-hidden className={cn("mb-2 block h-1.5 rounded-pill", i < step ? "bg-green-700" : i === step ? "bg-[linear-gradient(to_right,var(--color-green-700)_55%,var(--color-line)_55%)]" : "bg-line")} />
              {label}
            </li>
          ))}
        </ol>
        {row.trip?.driverName ? (
          <div className="mt-5 flex items-center gap-3 border-t border-line-soft pt-4">
            <Avatar name={row.trip.driverName} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-ink">{row.trip.driverName}</p>
              <p className="truncate text-caption text-ink-3">{[row.truckType, row.trip.plate, goods].filter(Boolean).join(" · ")}</p>
            </div>
            <Link href={href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              {t.trackButton}
            </Link>
          </div>
        ) : null}
      </section>
    </>
  );
}

function Head({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lead font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

const allTrips = (
  <Link href="/app/ship/trips" className="inline-flex min-h-11 items-center text-body-sm font-semibold text-green-700">
    {t.allTrips}
  </Link>
);

export async function SenderHome({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const rows = orgId ? await shipperLoads(orgId, 20) : [];
  const current = rows.find((r) => r.trip && LIVE.includes(r.trip.status)) ?? rows.find((r) => r.status === "funded");
  const draft = rows.find((r) => UNPAID.includes(r.status));
  const route = (r: LoadRow) => `${r.from} → ${r.to}`;
  const recent = rows.slice(0, 5);
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="lg:hidden">
        <Search_ />
      </div>
      <PhoneTiles />
      {draft ? (
        <>
          {/* P07 Needs you */}
          <section className="flex flex-col gap-3 lg:hidden">
            <Head title={t.needsYou} />
            <div className="flex items-center gap-3 rounded-card border border-warning/25 bg-surface p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-warning-100 text-warning">
                <Clock aria-hidden className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-ink">{fill(t.draftIs, { route: route(draft) })}</p>
                <p className="truncate text-meta text-ink-3">{fill(t.draftSub, { amount: naira(draft.totalKobo) })}</p>
              </div>
              <Link href={`/app/pay/${draft.id}`} className={buttonVariants({ size: "sm" })}>
                {t.pay}
              </Link>
            </div>
          </section>
          {/* D02 banner */}
          <div className="hidden items-center gap-4 rounded-card bg-warning-100 py-3.5 pr-4 pl-4.5 lg:flex">
            <span className="grid size-9 shrink-0 place-items-center rounded-icon bg-surface text-warning">
              <Clock aria-hidden className="size-4.5" strokeWidth={1.8} />
            </span>
            <p className="min-w-0 flex-1 text-body text-ink">{fill(t.draftBanner, { route: route(draft), amount: naira(draft.totalKobo) })}</p>
            <Link href={`/app/pay/${draft.id}`} className={buttonVariants({ size: "sm" })}>
              {t.payNow}
            </Link>
          </div>
        </>
      ) : null}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        {current ? (
          <section className="flex flex-col gap-3">
            <div className="lg:hidden">
              <Head title={t.current} action={allTrips} />
            </div>
            <CurrentCard row={current} />
          </section>
        ) : null}
        <div className={cn("hidden lg:block", !current && "lg:col-span-2")}>
          <DeskTiles example={rows[0]?.ref ?? "FA-7K3Q9"} />
        </div>
      </div>
      {recent.length ? (
        <section className="flex flex-col gap-3 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:px-6 lg:pt-5 lg:pb-2">
          <Head title={t.recent} action={allTrips} />
          <ul className="overflow-hidden rounded-card border border-line bg-surface lg:hidden">
            {recent.map((row) => (
              <TripRow key={row.id} row={row} href={`/app/ship/trips/${row.id}`} />
            ))}
          </ul>
          <table className="hidden w-full text-left lg:table">
            <thead>
              <tr className="text-caption font-semibold tracking-caps text-ink-3 uppercase">
                <th className="py-2.5 font-semibold">{t.cols.route}</th>
                <th className="py-2.5 font-semibold">{t.cols.goods}</th>
                <th className="py-2.5 font-semibold">{t.cols.date}</th>
                <th className="py-2.5 font-semibold">{t.cols.status}</th>
                <th className="py-2.5 text-right font-semibold">{t.cols.amount}</th>
              </tr>
            </thead>
            <tbody className="text-body-sm text-ink">
              {recent.map((row) => {
                const status = statusOf(row);
                return (
                  <tr key={row.id} className="border-t border-line-soft">
                    <td className="py-3.5 font-semibold">
                      <Link href={`/app/ship/trips/${row.id}`} className="hover:underline">
                        {route(row)}
                      </Link>
                    </td>
                    <td className="py-3.5">{[row.goods, loadLine(row)].filter(Boolean).join(", ")}</td>
                    <td className="py-3.5">{dayLabel(row.pickupFrom).split(" ").slice(1).join(" ")}</td>
                    <td className="py-3.5">
                      <StatusChip tone={status.tone}>{status.label}</StatusChip>
                    </td>
                    <td className="tabular py-3.5 text-right">{naira(row.totalKobo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
