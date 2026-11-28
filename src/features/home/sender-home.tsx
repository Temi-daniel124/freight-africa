import { ArrowRight, ChevronRight, Clock, FileText, Lock, MapPin, Search, ShieldCheck, Sparkles, Tag } from "lucide-react";
import Image from "next/image";
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
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
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
            <li key={label} className={cn("text-caption", i === 3 ? "text-right" : i === 0 ? "" : "text-center", i === step ? "font-semibold text-green-800" : "text-ink-2")}>
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


const fv = t.first;
const nt = t.noTrip;

/** P07b / D02c: a sender with no bookings yet. */
function FirstVisit() {
  const points = [
    { icon: Lock, text: fv.points[0] },
    { icon: ShieldCheck, text: fv.points[1] },
    { icon: MapPin, text: fv.points[2] },
  ];
  const list = (
    <ul className="flex flex-col gap-3.5">
      {points.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
            <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
          </span>
          <span className="text-body-sm text-ink">{text}</span>
        </li>
      ))}
    </ul>
  );
  const offer = (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-100 px-3 py-1.5 text-caption font-semibold text-success">
      <Sparkles aria-hidden className="size-3.5" strokeWidth={2} />
      {fv.offer}
    </span>
  );
  return (
    <>
      {/* phone (P07b) */}
      <div className="flex flex-col gap-5.5 lg:hidden">
        <section className="flex flex-col items-center rounded-card border border-line bg-surface px-5 py-6 text-center">
          <div className="relative grid h-37.5 w-full place-items-center">
            <span aria-hidden className="absolute size-37.5 rounded-full bg-green-50" />
            <Image src="/art/box.webp" alt="" width={240} height={194} className="relative w-30" />
          </div>
          <h2 className="mt-3.5 text-title-2 text-ink">{fv.title}</h2>
          <p className="mt-1.5 text-body-sm text-ink-2">{fv.text}</p>
          <div className="mt-3.5">{offer}</div>
          <Link href="/app/ship/book" className={cn(buttonVariants({ size: "lg" }), "mt-4.5 w-full")}>
            {fv.cta}
          </Link>
        </section>
        <div className="px-1">{list}</div>
      </div>
      {/* desktop (D02c) */}
      <section className="hidden grid-cols-2 items-center gap-10 overflow-hidden rounded-card border border-line bg-surface p-12 lg:grid">
        <div>
          {offer}
          <h2 className="mt-4 text-[2.375rem] leading-[1.08] font-semibold tracking-[-0.04em] text-ink">{fv.title}</h2>
          <p className="mt-3 text-body-lg text-ink-2">{fv.textDesk}</p>
          <Link href="/app/ship/book" className={cn(buttonVariants({ size: "lg" }), "mt-6 w-65")}>
            {fv.cta}
          </Link>
          <div className="mt-7">{list}</div>
        </div>
        <div aria-hidden className="relative h-95 overflow-hidden rounded-[28px] bg-green-50">
          <Image src="/art/van.webp" alt="" width={560} height={290} className="absolute -right-10 bottom-7.5 w-110" />
          <Image src="/art/courier-placeholder.webp" alt="" width={300} height={420} className="absolute -bottom-10 left-7.5 w-57.5" />
        </div>
      </section>
    </>
  );
}

type Reply = { id: string; loadId: string; owner: string; amountKobo: number; route: string; expiresAt: string | null };

/** Owners' replies to this business's offers that are still open (D047), for Needs you. */
async function openReplies(rows: LoadRow[]): Promise<Reply[]> {
  const funded = rows.filter((r) => r.status === "funded" && !r.trip);
  if (!funded.length) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("offers")
    .select("id, load_id, amount_kobo, expires_at, transporter_org_id")
    .in(
      "load_id",
      funded.map((r) => r.id),
    )
    .eq("kind", "counter")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(3);
  // Senders can't read other businesses (RLS); the replying owner's business name is shown on the reply
  // (P11b), so only those names are read with the service key.
  const ids = [...new Set((data ?? []).map((o) => o.transporter_org_id))];
  const { data: orgs } = ids.length ? await supabaseAdmin().from("organizations").select("id, name").in("id", ids) : { data: [] };
  return (data ?? []).map((o) => {
    const row = funded.find((r) => r.id === o.load_id);
    const owner = orgs?.find((x) => x.id === o.transporter_org_id)?.name ?? "";
    return { id: o.id, loadId: o.load_id, owner, amountKobo: Number(o.amount_kobo), route: row ? `${row.from} → ${row.to}` : "", expiresAt: o.expires_at };
  });
}

function timeLeft(at: string | null, now: number) {
  if (!at) return "";
  const mins = Math.max(0, Math.round((new Date(at).getTime() - now) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
}

/** D02b (and its phone parts): nothing on the road. Needs you, recently delivered, book again. */
function NoTripHome({ rows, drafts, replies, now }: { rows: LoadRow[]; drafts: LoadRow[]; replies: Reply[]; now: number }) {
  const delivered = rows.find((r) => ["delivered", "delivered_with_exception", "closed"].includes(r.trip?.status ?? ""));
  const seen = new Set<string>();
  const again = rows
    .filter((r) => {
      const key = `${r.from}-${r.to}`;
      if (!r.trip || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);
  const needs = drafts.length + replies.length;
  const route = (r: LoadRow) => `${r.from} → ${r.to}`;
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        {needs ? (
          <section className="rounded-card border border-line bg-surface px-5 pt-5 pb-2 lg:px-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{t.needsYou}</h2>
              <span className="tabular rounded-pill bg-warning-100 px-2 py-0.5 text-caption font-semibold text-warning">{needs}</span>
            </div>
            <ul className="mt-1.5">
              {drafts.map((d) => (
                <li key={d.id} className="flex items-center gap-3 border-line-soft py-3.5 not-first:border-t">
                  <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-warning-100 text-warning">
                    <FileText aria-hidden className="size-4.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink">{fill(t.draftIs, { route: route(d) })}</span>
                    <span className="block text-meta text-ink-3">{fill(nt.draftSub, { amount: naira(d.totalKobo) })}</span>
                  </span>
                  <Link href={`/app/pay/${d.id}`} className={buttonVariants({ size: "sm" })}>
                    {t.pay}
                  </Link>
                </li>
              ))}
              {replies.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-line-soft py-3.5 not-first:border-t">
                  <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-warning-100 text-warning">
                    <Tag aria-hidden className="size-4.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink">{fill(nt.replied, { owner: r.owner })}</span>
                    <span className="block text-meta text-ink-3">{fill(nt.repliedSub, { amount: naira(r.amountKobo), route: r.route, left: timeLeft(r.expiresAt, now) })}</span>
                  </span>
                  <Link href={`/app/ship/trips/${r.loadId}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    {nt.review}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {delivered ? (
          <section className="rounded-card border border-line bg-surface px-5 py-5.5 lg:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{nt.delivered}</h2>
              {allTrips}
            </div>
            <div className="mt-3.5 flex gap-4">
              <span aria-hidden className="grid size-22 shrink-0 place-items-center rounded-[20px] bg-green-50">
                <Image src="/art/box.webp" alt="" width={128} height={104} className="w-16" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-title-3 text-ink">{route(delivered)}</p>
                  <StatusChip tone="success">{messages.trips.progress.delivered}</StatusChip>
                </div>
                <p className="mt-1 text-meta text-ink-3">
                  {[[delivered.goods, loadLine(delivered)].filter(Boolean).join(", "), delivered.trip?.deliveredAt ? dayLabel(delivered.trip.deliveredAt) : null, delivered.trip?.driverName]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/app/ship/book" className={buttonVariants({ size: "sm" })}>
                    {nt.bookAgain}
                  </Link>
                  <Link href={`/app/ship/trips/${delivered.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    {nt.receipt}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
      <div className="flex flex-col gap-5">
        <Link href="/app/ship/book" className="relative block min-h-47.5 overflow-hidden rounded-card bg-green-900 p-6 text-white hover:bg-green-800">
          <span className="relative z-10 block text-title-2 font-semibold">{t.book}</span>
          <span className="relative z-10 mt-1 block text-body-sm text-green-300">{nt.nothing}</span>
          <Image src="/art/van.webp" alt="" width={560} height={290} className="absolute -right-7.5 -bottom-3 w-65" />
        </Link>
        {again.length ? (
          <section className="rounded-card border border-line bg-surface px-5.5 pt-5 pb-2">
            <h2 className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{nt.bookAgain}</h2>
            <ul className="mt-1.5">
              {again.map((r) => (
                <li key={r.id} className="border-line-soft not-first:border-t">
                  <Link href="/app/ship/book" className="flex min-h-15 items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{route(r)}</span>
                      <span className="block truncate text-meta text-ink-3">{[r.truckType, r.goods.toLowerCase(), fill(nt.last, { amount: naira(r.totalKobo) })].filter(Boolean).join(" · ")}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4.5 text-ink-3" strokeWidth={1.8} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export async function SenderHome({ viewer, preview }: { viewer: Promise<Viewer>; preview?: string }) {
  const { orgId } = await viewer;
  // ?preview=first|notrip shows that state of Home for this account (compare previews, closing brief §2).
  const rows = orgId && preview !== "first" ? await shipperLoads(orgId, 20) : [];
  if (!rows.length) return <FirstVisit />;
  const live = rows.find((r) => r.trip && LIVE.includes(r.trip.status)) ?? rows.find((r) => r.status === "funded");
  const current = preview === "notrip" ? undefined : live;
  const draft = rows.find((r) => UNPAID.includes(r.status));
  if (!current) {
    const drafts = rows.filter((r) => UNPAID.includes(r.status)).slice(0, 1);
    const replies = await openReplies(rows);
    return <NoTripHome rows={rows} drafts={drafts} replies={replies} now={new Date().getTime()} />;
  }
  const route = (r: LoadRow) => `${r.from} → ${r.to}`;
  const recent = rows.slice(0, 3);
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
