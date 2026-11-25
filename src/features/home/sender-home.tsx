import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { Box } from "@/components/art/pieces";
import { TruckGraphic } from "@/components/art/truck";
import { shipperLoads, type LoadRow } from "@/features/booking/data";
import { CurrentTripCard, naira, TripRow } from "@/features/booking/pieces";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

const t = messages.home2;
const LIVE = [
  "assigned",
  "to_pickup",
  "at_pickup",
  "loading",
  "loaded",
  "in_transit",
  "arrived",
];

function Tile({
  href,
  title,
  art,
}: {
  href: string;
  title: string;
  art: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative flex h-36 overflow-hidden rounded-tile bg-surface p-4 shadow-raised transition-transform active:scale-press lg:h-44 lg:rounded-card lg:p-5"
    >
      <span className="relative z-1 max-w-[9ch] text-body-lg leading-tight font-semibold text-ink lg:text-title-3">
        {title}
      </span>
      <span aria-hidden className="absolute -right-6 -bottom-3 w-[70%]">
        {art}
      </span>
    </Link>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body-lg font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** What waits on the sender (pay, answer an offer): "Your move: …". */
async function needsYou(rows: LoadRow[]) {
  const items: { href: string; text: string }[] = [];
  for (const row of rows) {
    if (row.status === "draft" || row.status === "awaiting_payment")
      items.push({
        href: `/app/ship/trips/${row.id}`,
        text: t.payFor
          .replace("{ref}", row.ref)
          .replace("{amount}", naira(row.totalKobo)),
      });
  }
  const funded = rows.filter((r) => r.status === "funded").map((r) => r.id);
  if (funded.length) {
    const { data } = await (
      await supabaseServer()
    )
      .from("offers")
      .select("load_id")
      .in("load_id", funded)
      .eq("kind", "counter")
      .eq("status", "pending");
    for (const o of data ?? []) {
      const row = rows.find((r) => r.id === o.load_id);
      if (row)
        items.push({
          href: `/app/ship/trips/${row.id}`,
          text: t.answerOffer.replace("{ref}", row.ref),
        });
    }
  }
  return items.slice(0, 4);
}

/** Sender Home (reference 03, D045): search, two tiles, Needs you, Current trip, Recent trips. */
export async function SenderHome({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  const rows = orgId ? await shipperLoads(orgId, 20) : [];
  const current =
    rows.find((r) => r.trip && LIVE.includes(r.trip.status)) ??
    rows.find((r) => r.status === "funded");
  const needs = await needsYou(rows);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="flex min-w-0 flex-col gap-6">
        <form action="/app/ship/track" className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3"
            strokeWidth={1.75}
          />
          <label htmlFor="home-search" className="sr-only">
            {messages.track.placeholder}
          </label>
          <input
            id="home-search"
            name="ref"
            placeholder={messages.track.placeholder}
            className="h-13 w-full min-w-0 rounded-pill border border-line bg-surface pr-4 pl-12 text-body text-ink shadow-raised outline-none placeholder:text-ink-3 focus:border-green-700"
          />
        </form>
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Tile
            href="/app/ship/book"
            title={t.book}
            art={<TruckGraphic kind="covered" load={null} />}
          />
          <Tile
            href="/app/ship/track"
            title={t.track}
            art={
              <svg viewBox="-80 -140 160 160" className="w-full">
                <Box s={1} />
              </svg>
            }
          />
        </div>
        {current ? (
          <Section title={t.current}>
            <CurrentTripCard
              row={current}
              href={
                current.trip
                  ? `/app/ship/trips/${current.id}/track`
                  : `/app/ship/trips/${current.id}`
              }
            />
          </Section>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {needs.length ? (
          <Section title={t.needsYou}>
            <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
              {needs.map((n) => (
                <li key={n.href + n.text}>
                  <Link
                    href={n.href}
                    className="flex min-h-14 items-center gap-3 border-t border-line px-4 py-3 text-body-sm first:border-t-0 hover:bg-paper"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full bg-warning"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <b className="font-semibold text-ink">{t.yourMove}</b>{" "}
                      <span className="text-ink-2">{n.text}</span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-ink-3"
                      strokeWidth={1.75}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
        <Section
          title={t.recent}
          action={
            <Link
              href="/app/ship/trips"
              className="inline-flex min-h-11 items-center text-body-sm font-semibold text-green-700"
            >
              {t.seeAll}
            </Link>
          }
        >
          {rows.length ? (
            <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
              {rows.slice(0, 5).map((row) => (
                <TripRow
                  key={row.id}
                  row={row}
                  href={`/app/ship/trips/${row.id}`}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-tile bg-surface p-5 text-body-sm text-ink-2 shadow-raised">
              {messages.trips.emptyText}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
