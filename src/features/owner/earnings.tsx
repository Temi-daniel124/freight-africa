import { Banknote, Check, ChevronDown, ChevronLeft, Download, FileText, Landmark, Sheet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { naira } from "@/features/booking/pieces";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// O17 / OD06 earnings, O17b one payout. Owners and Admins (see_money); drivers never (D003). Bank details
// show only to the business owner (bank_accounts RLS). Money held for a problem comes with Phase 5.

const e = messages.ownerEarnings;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(iso)).replace(",", "");
const monthOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso)).slice(0, 7);
const monthLabel = (ym: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
const COMING = ["queued", "awaiting_approval", "processing"];
const monthName = (ym: string) => new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(`${ym}-15T12:00:00Z`));
const shortDay = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(iso));
// OD06 filter chips: All, Advances, Balances, Charges (every other kind of payout).
const KIND_FILTERS = {
  all: ["advance", "balance", "cancellation_fee", "waiting_charge", "transload_share", "agent_share"],
  advances: ["advance"],
  balances: ["balance"],
  charges: ["cancellation_fee", "waiting_charge", "transload_share"],
} as const satisfies Record<string, readonly string[]>;

function usableNow(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

function thisMonth() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Africa/Lagos" }).format(new Date()).slice(0, 7);
}

export async function OwnerEarnings({ viewer, month: askedMonth, kind: askedKind }: { viewer: Promise<Viewer>; month?: string; kind?: string }) {
  const { orgId } = await viewer;
  if (!orgId) return null;
  const supabase = await supabaseServer();
  const [{ data: payouts }, { data: bank }, { data: monthsPaid }] = await Promise.all([
    supabase.from("payouts").select("id, kind, amount_kobo, status, paid_at, created_at, trip:trips(id, ref)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(500),
    supabase.from("bank_accounts").select("bank_name, account_last4, resolved_name, status, usable_from").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1),
    // Statements: every month with paid money, beyond the newest payouts shown above (review).
    supabase.from("payouts").select("trip_id, kind, amount_kobo, paid_at").eq("org_id", orgId).eq("status", "paid").order("paid_at", { ascending: false }).limit(5000),
  ]);
  const rows = payouts ?? [];
  const now = thisMonth();
  const paidMonth = rows.filter((p) => p.status === "paid" && p.paid_at && monthOf(p.paid_at) === now).reduce((s, p) => s + Number(p.amount_kobo), 0);
  const coming = rows.filter((p) => COMING.includes(p.status)).reduce((s, p) => s + Number(p.amount_kobo), 0);
  // Held for a problem (O17, OD06): payouts staff hold while a problem is open.
  const held = rows.filter((p) => p.status === "held").reduce((s, p) => s + Number(p.amount_kobo), 0);
  // Statements: every month with a paid payout, newest first (net paid to the owner that month).
  const months = new Map<string, { net: number; trips: Set<string> }>();
  for (const p of monthsPaid ?? []) {
    if (!p.paid_at) continue;
    const k = monthOf(p.paid_at);
    const v = months.get(k) ?? { net: 0, trips: new Set<string>() };
    v.net += Number(p.amount_kobo);
    if (p.trip_id) v.trips.add(p.trip_id);
    months.set(k, v);
  }
  // The month picker: this month and every month with a payout.
  const pickable = [...new Set([now, ...rows.map((p) => monthOf(p.paid_at ?? p.created_at))])].sort().reverse();
  const month = askedMonth && pickable.includes(askedMonth) ? askedMonth : now;
  const kind = askedKind && askedKind in KIND_FILTERS ? (askedKind as keyof typeof KIND_FILTERS) : "all";
  const shown = rows.filter((p) => monthOf(p.paid_at ?? p.created_at) === month && (KIND_FILTERS[kind] as readonly string[]).includes(p.kind));
  // The statement card: the last finished month with money paid (OD06 "October statement").
  const statementMonth = [...months.keys()].find((k) => k < now) ?? [...months.keys()][0];
  const statement = statementMonth ? months.get(statementMonth) : undefined;
  const ba = bank?.[0];
  const href = (m: string, k: string) => `/app/haul/earnings?${new URLSearchParams({ ...(m !== now ? { month: m } : {}), ...(k !== "all" ? { kind: k } : {}) })}`;
  const picker = (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-pill px-3 text-body-sm font-semibold text-ink lg:border lg:border-line lg:bg-surface [&::-webkit-details-marker]:hidden">
        {monthName(month)}
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" strokeWidth={1.8} />
      </summary>
      <ul className="absolute right-0 z-20 mt-1 min-w-44 rounded-tile border border-line bg-surface p-1 shadow-raised">
        {pickable.map((m) => (
          <li key={m}>
            <Link href={href(m, kind)} className={cn("flex min-h-11 items-center rounded-nav px-3 text-body-sm", m === month ? "bg-green-50 font-semibold text-green-800" : "text-ink hover:bg-paper")}>
              {monthLabel(m)}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
  const statusPill = (p: (typeof rows)[number]) =>
    p.status === "held" ? (
      <span className="inline-flex rounded-pill bg-[#FDF3D0] px-2.5 py-0.5 text-caption font-semibold text-[#7A5A00]">{e.heldPart}</span>
    ) : (
      <StatusChip tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "info"}>{e.status[p.status as keyof typeof e.status] ?? p.status}</StatusChip>
    );
  const ref = (p: (typeof rows)[number]) => (p.trip as unknown as { id: string; ref: string } | null)?.ref.replace(/-T\d+$/, "") ?? "";
  const statementCard = statement && statementMonth ? (
    <section className="rounded-card border border-line bg-surface p-4.5 lg:px-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body font-semibold text-ink lg:text-caption lg:tracking-caps lg:text-ink-3 lg:uppercase">
          <span className="lg:hidden">{monthLabel(statementMonth)}</span>
          <span className="hidden lg:inline">{fill(e.statementFor, { month: monthName(statementMonth) })}</span>
        </span>
        <span className="text-meta text-ink-3 lg:hidden">{fill(statement.trips.size === 1 ? e.tripOne : e.trips, { n: statement.trips.size })}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="text-meta text-ink-2">
          <span className="lg:hidden">{e.netPaid}</span>
          <span className="hidden lg:inline">{fill(statement.trips.size === 1 ? e.tripOne : e.trips, { n: statement.trips.size })} · {e.net}</span>
        </span>
        <span className="tabular text-body font-semibold text-ink">{naira(statement.net)}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <a href={`/app/haul/statements/${statementMonth}/pdf`} className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "flex-1")}>
          <FileText aria-hidden strokeWidth={1.8} />
          {e.pdf}
        </a>
        <a href={`/app/haul/statements/${statementMonth}/csv`} className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "flex-1")}>
          <Sheet aria-hidden strokeWidth={1.8} />
          {e.spreadsheet}
        </a>
      </div>
    </section>
  ) : null;
  const bankCard = ba ? (
    <section className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 lg:flex-col lg:items-start lg:gap-0 lg:px-5 lg:py-4.5">
      <span className="hidden text-caption font-semibold tracking-caps text-ink-3 uppercase lg:block">{e.bank}</span>
      <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700 lg:hidden">
        <Landmark aria-hidden className="size-4.5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1 lg:mt-2">
        <span className="block text-body font-semibold text-ink">
          {ba.bank_name} ••{ba.account_last4}
        </span>
        <span className="block truncate text-caption text-ink-3">
          {ba.resolved_name}
          {ba.status === "active" && usableNow(ba.usable_from) ? ` · ${e.verified}` : ` · ${fill(e.usableFrom, { when: when(ba.usable_from) })}`}
        </span>
      </span>
      <Link href="/app/haul/earnings/bank" className="text-body-sm font-semibold text-green-700 lg:hidden">
        {e.change}
      </Link>
      <Link href="/app/haul/earnings/bank" className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "mt-3 hidden w-full lg:inline-flex")}>
        {e.changeBank}
      </Link>
    </section>
  ) : null;
  const tileNum = "tabular truncate text-[30px] leading-tight font-semibold tracking-[-0.035em]";
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
      {statementMonth ? (
        // OD06: the statement button sits on the page title row, which the shell draws just above.
        <div className="hidden justify-end lg:-mt-[4.5rem] lg:mb-3 lg:flex">
          <a href={`/app/haul/statements/${statementMonth}/pdf`} className={buttonVariants({ size: "sm", variant: "secondary" })}>
            <Download aria-hidden strokeWidth={1.8} />
            {fill(e.statementFor, { month: monthName(statementMonth) })}
          </a>
        </div>
      ) : null}
      {/* phone (O17): one deep card with coming and held inside */}
      <section className="relative overflow-hidden rounded-card bg-green-900 p-5 text-white lg:hidden">
        <span aria-hidden className="absolute -top-15 -right-12.5 size-42.5 rounded-full bg-green-700" />
        <div className="relative">
          <p className="text-meta text-green-300">{e.paidMonth}</p>
          <p className="tabular text-[36px] leading-tight font-semibold tracking-[-0.04em]">{naira(paidMonth)}</p>
          <div className="mt-3.5 flex gap-2.5">
            <div className="min-w-0 flex-1 rounded-tile bg-white/8 px-3 py-2.5">
              <p className="text-caption text-green-300">{e.coming}</p>
              <p className="tabular truncate text-body font-semibold">{naira(coming)}</p>
            </div>
            <div className="min-w-0 flex-1 rounded-tile bg-white/8 px-3 py-2.5">
              <p className="text-caption text-green-300">{e.held}</p>
              <p className="tabular truncate text-body font-semibold">{naira(held)}</p>
            </div>
          </div>
        </div>
      </section>
      {/* desktop (OD06): three tiles */}
      <div className="hidden grid-cols-3 gap-4 lg:grid">
        <div className="rounded-card bg-green-900 px-5.5 py-5 text-white">
          <p className="text-meta text-green-300">{e.paidMonth}</p>
          <p className={tileNum}>{naira(paidMonth)}</p>
        </div>
        <div className="rounded-card border border-line bg-surface px-5.5 py-5">
          <p className="text-meta text-ink-2">{e.coming}</p>
          <p className={cn(tileNum, "text-ink")}>{naira(coming)}</p>
        </div>
        <div className="rounded-card border border-line bg-surface px-5.5 py-5">
          <p className="text-meta text-ink-2">{e.held}</p>
          <p className={cn(tileNum, "text-ink")}>{naira(held)}</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between px-1 lg:hidden">
            <h2 className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{e.payouts}</h2>
            {picker}
          </div>
          <div className="rounded-card border border-line bg-surface lg:overflow-visible">
            <div className="hidden items-center gap-2 px-5 py-4 lg:flex">
              {(Object.keys(KIND_FILTERS) as (keyof typeof KIND_FILTERS)[]).map((k) => (
                <Link key={k} href={href(month, k)} className={cn("inline-flex min-h-9 items-center rounded-pill border px-3.5 text-body-sm font-semibold", k === kind ? "border-green-800 bg-green-800 text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                  {e.filters[k]}
                </Link>
              ))}
              <div className="ml-auto">{picker}</div>
            </div>
            {shown.length ? (
              <>
                <ul className="px-4 lg:hidden">
                  {shown.slice(0, 40).map((p) => (
                    <li key={p.id}>
                      <Link href={`/app/haul/earnings/${p.id}`} className="flex items-center gap-3 border-t border-line-soft py-3.5 first:border-t-0">
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon", p.status === "held" ? "bg-[#FDF3D0] text-[#7A5A00]" : "bg-green-50 text-green-700")}>
                          <Banknote aria-hidden className="size-4.5" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm font-semibold text-ink">
                            {e.kinds[p.kind as keyof typeof e.kinds] ?? p.kind} · {ref(p)}
                          </span>
                          <span className="block text-caption text-ink-3">{p.status === "held" ? e.heldWaiting : p.paid_at ? when(p.paid_at) : e.status[p.status as keyof typeof e.status]}</span>
                        </span>
                        <span className="text-right">
                          <span className="tabular block text-body-sm font-semibold text-ink">{naira(Number(p.amount_kobo))}</span>
                          {statusPill(p)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <table className="hidden w-full text-left text-body-sm lg:table">
                  <thead>
                    <tr className="text-caption font-semibold tracking-caps text-ink-3 uppercase">
                      {[e.cols.date, e.cols.trip, e.cols.kind, e.cols.status].map((c) => (
                        <th key={c} className="px-5 py-2.5 font-semibold">
                          {c}
                        </th>
                      ))}
                      <th className="px-5 py-2.5 text-right font-semibold">{e.cols.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.slice(0, 60).map((p) => (
                      <tr key={p.id} className="border-t border-line-soft">
                        <td className="px-5 py-3.5">{shortDay(p.paid_at ?? p.created_at)}</td>
                        <td className="px-5 py-3.5 font-semibold">
                          <Link href={`/app/haul/earnings/${p.id}`} className="hover:underline">
                            {ref(p)}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5">{e.kinds[p.kind as keyof typeof e.kinds] ?? p.kind}</td>
                        <td className="px-5 py-3.5">{statusPill(p)}</td>
                        <td className="tabular px-5 py-3.5 text-right font-semibold">{naira(Number(p.amount_kobo))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-title-3 text-ink">{messages.earnings.empty}</p>
                <p className="mt-1 text-body-sm text-ink-2">{messages.earnings.emptyText}</p>
              </div>
            )}
          </div>
        </section>
        <div className="flex min-w-0 flex-col gap-4 lg:flex-col-reverse lg:justify-end">
          <div className="flex flex-col gap-2">
            <h2 className="px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase lg:hidden">{e.statements}</h2>
            {statementCard}
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase lg:hidden">{e.bank}</h2>
            {bankCard}
          </div>
        </div>
      </div>
    </div>
  );
}

/** O17b one payout: its steps, where it went, and the payout advice PDF. */
export async function OwnerPayout({ id }: { id: string }) {
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("payouts").select("id, kind, amount_kobo, status, paid_at, created_at, provider_ref, bank_account_id, trip:trips(id, ref, load:loads(from:cities!loads_from_city_id_fkey(name), to:cities!loads_to_city_id_fkey(name)))").eq("id", id).maybeSingle();
  if (!p) notFound();
  const trip = p.trip as unknown as { id: string; ref: string; load: { from: { name: string } | null; to: { name: string } | null } | null } | null;
  const [{ data: bank }, { data: siblings }, money] = await Promise.all([
    p.bank_account_id ? supabase.from("bank_accounts").select("bank_name, account_last4").eq("id", p.bank_account_id).maybeSingle() : Promise.resolve({ data: null }),
    trip ? supabase.from("payouts").select("kind, status").eq("trip_id", trip.id) : Promise.resolve({ data: [] }),
    trip ? supabase.rpc("trip_money", { p_trip: trip.id }) : Promise.resolve({ data: null }),
  ]);
  const paid = p.status === "paid";
  const steps = [
    { title: p.kind === "advance" ? e.step1Advance : p.kind === "balance" ? e.step1Balance : (e.kinds[p.kind as keyof typeof e.kinds] ?? p.kind), at: p.created_at, done: true },
    { title: e.step2, at: paid ? p.paid_at : null, done: paid || p.status === "processing" },
    { title: e.step3, at: p.paid_at, done: paid },
  ];
  const balanceDue = p.kind === "advance" && !(siblings ?? []).some((s) => s.kind === "balance" && s.status === "paid") ? Number(money?.data?.[0]?.balance_kobo ?? 0) : 0;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <Link href="/app/haul/earnings" className="inline-flex items-center gap-1 text-body-sm text-ink-2">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={1.8} />
        {messages.shell.pages.earnings.title}
      </Link>
      <section className="rounded-card border border-line bg-surface p-5 text-center">
        <StatusChip tone={paid ? "success" : "info"}>{e.status[p.status as keyof typeof e.status] ?? p.status}</StatusChip>
        <p className="tabular mt-2 text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">{naira(Number(p.amount_kobo))}</p>
        <p className="text-meta text-ink-3">
          {e.kinds[p.kind as keyof typeof e.kinds] ?? p.kind} · {trip?.ref.replace(/-T\d+$/, "")} · {trip?.load?.from?.name} → {trip?.load?.to?.name}
        </p>
      </section>
      <ol className="rounded-card border border-line bg-surface p-4.5">
        {steps.map((s) => (
          <li key={s.title} className="flex items-center gap-3 py-1.5">
            <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full", s.done ? "bg-green-700 text-white" : "border-2 border-line")}>{s.done ? <Check className="size-3.5" strokeWidth={2.6} /> : null}</span>
            <span className={cn("min-w-0 flex-1 text-body", s.done ? "font-semibold text-ink" : "text-ink-3")}>{s.title}</span>
            {s.at && s.done ? <span className="text-meta text-ink-3">{new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(s.at))}</span> : null}
          </li>
        ))}
      </ol>
      <dl className="rounded-card border border-line bg-surface px-4.5">
        <div className="flex justify-between border-t border-line-soft py-3.5 first:border-t-0">
          <dt className="text-body-sm text-ink-2">{e.to}</dt>
          <dd className="text-body-sm font-semibold text-ink">{bank ? `${bank.bank_name} ••${bank.account_last4}` : e.yourBank}</dd>
        </div>
        {p.provider_ref ? (
          <div className="flex justify-between border-t border-line-soft py-3.5">
            <dt className="text-body-sm text-ink-2">{e.reference}</dt>
            <dd className="tabular text-body-sm font-semibold text-ink">{p.provider_ref}</dd>
          </div>
        ) : null}
        {balanceDue ? (
          <div className="flex justify-between border-t border-line-soft py-3.5">
            <dt className="text-body-sm text-ink-2">{e.stillToCome}</dt>
            <dd className="tabular text-body-sm font-semibold text-ink">{naira(balanceDue)}</dd>
          </div>
        ) : null}
      </dl>
      {paid ? (
        <a href={`/app/haul/earnings/${p.id}/pdf`} className={cn(buttonVariants({ size: "md" }), "w-full")}>
          <Download aria-hidden strokeWidth={1.8} />
          {e.download}
        </a>
      ) : null}
    </div>
  );
}

export const monthKey = thisMonth;
