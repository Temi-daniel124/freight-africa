import { Check, ChevronLeft, Download, FileText, Landmark } from "lucide-react";
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
const COMING = ["queued", "awaiting_approval", "processing", "held"];

function usableNow(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

function thisMonth() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Africa/Lagos" }).format(new Date()).slice(0, 7);
}

export async function OwnerEarnings({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  if (!orgId) return null;
  const supabase = await supabaseServer();
  const [{ data: payouts }, { data: bank }, { data: monthsPaid }] = await Promise.all([
    supabase.from("payouts").select("id, kind, amount_kobo, status, paid_at, created_at, trip:trips(id, ref)").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    supabase.from("bank_accounts").select("bank_name, account_last4, resolved_name, status, usable_from").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1),
    // Statements: every month with paid money, beyond the newest payouts shown above (review).
    supabase.from("payouts").select("trip_id, kind, amount_kobo, paid_at").eq("org_id", orgId).eq("status", "paid").order("paid_at", { ascending: false }).limit(5000),
  ]);
  const rows = payouts ?? [];
  const now = thisMonth();
  const paidMonth = rows.filter((p) => p.status === "paid" && p.paid_at && monthOf(p.paid_at) === now).reduce((s, p) => s + Number(p.amount_kobo), 0);
  const coming = rows.filter((p) => COMING.includes(p.status)).reduce((s, p) => s + Number(p.amount_kobo), 0);
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
  const ba = bank?.[0];
  return (
    <div className="mx-auto grid w-full max-w-[1080px] gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid grid-cols-2 overflow-hidden rounded-card bg-green-900 text-white">
          <div className="px-4.5 py-4 lg:px-6 lg:py-5">
            <p className="text-meta text-green-300">{e.paidMonth}</p>
            <p className="tabular truncate text-[clamp(20px,6.4vw,28px)] leading-tight font-semibold">{naira(paidMonth)}</p>
          </div>
          <div className="px-4.5 py-4 lg:px-6 lg:py-5">
            <p className="text-meta text-green-300">{e.coming}</p>
            <p className="tabular truncate text-[clamp(20px,6.4vw,28px)] leading-tight font-semibold">{naira(coming)}</p>
          </div>
        </div>
        <section>
          <h2 className="mb-2.5 px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase">{e.payouts}</h2>
          {rows.length ? (
            <ul className="rounded-card border border-line bg-surface px-4.5">
              {rows.slice(0, 40).map((p) => {
                const trip = p.trip as unknown as { id: string; ref: string } | null;
                return (
                  <li key={p.id}>
                    <Link href={`/app/haul/earnings/${p.id}`} className="flex items-center gap-3 border-t border-line-soft py-3.5 first:border-t-0">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-semibold text-ink">
                          {e.kinds[p.kind as keyof typeof e.kinds] ?? p.kind} · {trip?.ref.replace(/-T\d+$/, "")}
                        </span>
                        <span className="block text-meta text-ink-3">{p.paid_at ? when(p.paid_at) : e.status[p.status as keyof typeof e.status]}</span>
                      </span>
                      <span className="text-right">
                        <span className="tabular block text-body font-semibold text-ink">{naira(Number(p.amount_kobo))}</span>
                        <StatusChip tone={p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "info"}>{e.status[p.status as keyof typeof e.status] ?? p.status}</StatusChip>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-card border border-line bg-surface px-6 py-10 text-center">
              <p className="text-title-3 text-ink">{messages.earnings.empty}</p>
              <p className="mt-1 text-body-sm text-ink-2">{messages.earnings.emptyText}</p>
            </div>
          )}
        </section>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {months.size ? (
          <section>
            <h2 className="mb-2.5 px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase">{e.statements}</h2>
            <ul className="rounded-card border border-line bg-surface px-4.5">
              {[...months.entries()].map(([k, v]) => (
                <li key={k} className="flex items-center gap-3 border-t border-line-soft py-3.5 first:border-t-0">
                  <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
                    <FileText aria-hidden className="size-4.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-ink">{monthLabel(k)}</span>
                    <span className="block text-meta text-ink-3">
                      {fill(v.trips.size === 1 ? e.tripOne : e.trips, { n: v.trips.size })} · {e.net} {naira(v.net)}
                    </span>
                  </span>
                  <a href={`/app/haul/statements/${k}/pdf`} className={buttonVariants({ size: "sm", variant: "secondary" })}>
                    {e.pdf}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {ba ? (
          <section>
            <h2 className="mb-2.5 px-1 text-caption font-semibold tracking-caps text-ink-3 uppercase">{e.bank}</h2>
            <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
                <Landmark aria-hidden className="size-4.5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">
                  {ba.bank_name} ••{ba.account_last4}
                </span>
                <span className="block truncate text-meta text-ink-3">
                  {ba.resolved_name}
                  {ba.status === "active" && usableNow(ba.usable_from) ? ` · ${e.verified}` : ` · ${fill(e.usableFrom, { when: when(ba.usable_from) })}`}
                </span>
              </span>
              <Link href="/onboarding/owner" className="text-body-sm font-semibold text-green-700">
                {e.change}
              </Link>
            </div>
          </section>
        ) : null}
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
