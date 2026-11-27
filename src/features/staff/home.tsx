import { AlertTriangle, Banknote, Box, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { staffPageRoles, type StaffPage } from "@/features/shell/config";

// X26 My work and X01 Overview, from what the database holds today. SOS, tracking, disputes and the
// support inbox join these lists in their own phases (4 and 5); nothing here is sample data.

const t = messages.staffHome;
const naira = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(kobo / 100));
const compact = (kobo: number) => {
  const n = kobo / 100;
  return n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `₦${Math.round(n / 1000)}k` : naira(kobo);
};
const ago = (iso: string, now: number) => {
  const mins = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60_000));
  return mins < 60 ? `${mins} min` : mins < 48 * 60 ? `${Math.floor(mins / 60)} h` : `${Math.floor(mins / 1440)} d`;
};
const lagosDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d);
const dayStart = (offsetDays: number, now: number) => new Date(`${lagosDay(new Date(now - offsetDays * 86_400_000))}T00:00:00+01:00`).toISOString();
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived", "transloading"];

type WorkItem = { id: string; kind: "trips" | "loads" | "money"; icon: typeof Box; title: string; sub?: string; waiting: string; deadline?: string; href: string; action: string };

async function workData(now: number) {
  const supabase = await supabaseServer();
  const [noTruck, offers, failed, approvals, live] = await Promise.all([
    supabase.from("loads").select("id, ref, funded_at, no_truck_decision_due_at, weight_kg, from:from_city_id(name), to:to_city_id(name), type:truck_type_id(name)").eq("status", "funded").eq("is_demo", false).order("funded_at").limit(20),
    supabase.from("offers").select("id, created_at, amount_kobo, load:load_id(id, ref)").eq("status", "pending").order("created_at").limit(20),
    supabase.from("payouts").select("id, amount_kobo, created_at, trip:trip_id(ref)").eq("status", "failed").order("created_at").limit(20),
    supabase.from("approvals").select("id, kind, created_at").eq("status", "pending").order("created_at").limit(20),
    supabase.from("trips").select("id", { count: "exact", head: true }).in("status", LIVE as never[]),
  ]);
  const items: WorkItem[] = [
    ...(noTruck.data ?? []).map((l) => ({
      id: l.id,
      kind: "loads" as const,
      icon: Box,
      title: t.noTruck.replace("{ref}", l.ref).replace("{ago}", ago(l.funded_at ?? now.toString(), now)),
      sub: t.noTruckSub.replace("{route}", `${(l.from as { name?: string } | null)?.name ?? ""} → ${(l.to as { name?: string } | null)?.name ?? ""}`).replace("{truck}", `${Math.round((l.weight_kg ?? 0) / 1000)} t ${((l.type as { name?: string } | null)?.name ?? "").toLowerCase()}`),
      waiting: l.funded_at ? ago(l.funded_at, now) : "—",
      deadline: l.no_truck_decision_due_at ? t.refundChoice.replace("{t}", ago(new Date(2 * now - new Date(l.no_truck_decision_due_at).getTime()).toISOString(), now)) : undefined,
      href: `/admin/loads?load=${l.id}`,
      action: t.findTruck,
    })),
    ...(offers.data ?? []).map((o) => {
      const load = o.load as { id: string; ref: string } | null;
      return { id: o.id, kind: "loads" as const, icon: Scale, title: t.offer.replace("{ref}", load?.ref ?? "").replace("{amount}", naira(o.amount_kobo ?? 0)), waiting: ago(o.created_at, now), href: `/admin/loads?load=${load?.id ?? ""}`, action: t.openLoad };
    }),
    ...(failed.data ?? []).map((p) => ({ id: p.id, kind: "money" as const, icon: Banknote, title: t.payoutFailed.replace("{ref}", (p.trip as { ref?: string } | null)?.ref ?? "").replace("{amount}", naira(p.amount_kobo)), waiting: ago(p.created_at, now), href: "/admin/payouts", action: t.openPayouts })),
    ...(approvals.data ?? []).map((a) => ({ id: a.id, kind: "money" as const, icon: ShieldCheck, title: t.approval.replace("{kind}", a.kind.replace(/_/g, " ")), waiting: ago(a.created_at, now), href: "/admin/approvals", action: t.openApprovals })),
  ];
  const oldest = noTruck.data?.[0]?.funded_at;
  return { items, live: live.count ?? 0, noTruck: noTruck.data?.length ?? 0, oldest: oldest ? ago(oldest, now) : null, approvals: approvals.data?.length ?? 0, failed: failed.data?.length ?? 0 };
}

function Tile({ label, value, sub, tone }: { label: string; value: string | number; sub?: string | null; tone?: "warn" }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-meta text-ink-2">{label}</p>
      <p className="tabular mt-2 text-[24px] leading-none font-semibold text-ink">{value}</p>
      {sub ? <p className={cn("mt-2 text-caption", tone === "warn" ? "text-warning" : "text-ink-3")}>{sub}</p> : null}
    </div>
  );
}

export async function StaffWork({ name, filter = "all", now }: { name: string; filter?: string; now: number }) {
  const data = await workData(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date(now)));
  const greeting = (hour < 12 ? t.greeting.morning : hour < 17 ? t.greeting.afternoon : t.greeting.evening).replace("{name}", name.split(" ")[0]);
  const shown = filter === "all" ? data.items : data.items.filter((i) => i.kind === filter);
  const supabase = await supabaseServer();
  const { data: onCall } = await supabase.from("staff_members").select("user_id, role, person:user_id(full_name)").eq("active", true).in("role", ["operations", "super_admin"] as never[]).limit(6);
  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <h1 className="text-console-title text-ink">{greeting}</h1>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t.item}>
          {(["all", "trips", "loads", "money"] as const).map((f) => (
            <Link key={f} href={f === "all" ? "/admin/work" : `/admin/work?f=${f}`} role="tab" aria-selected={filter === f} className={cn("inline-flex h-9 items-center rounded-pill border px-4 text-body-sm font-semibold", filter === f ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink")}>
              {t.filters[f]}
            </Link>
          ))}
        </div>
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          {shown.length ? (
            <table className="w-full text-left">
              <thead className="border-b border-line text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                <tr>
                  <th className="py-3 pr-3 pl-16">{t.item}</th>
                  <th className="hidden px-3 py-3 md:table-cell">{t.waiting}</th>
                  <th className="hidden px-3 py-3 md:table-cell">{t.deadline}</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">{t.item}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((item) => (
                  <tr key={item.id} className="border-b border-line-soft last:border-b-0">
                    <td className="py-3.5 pr-3 pl-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
                          <item.icon aria-hidden className="size-4.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-body font-semibold text-ink">{item.title}</span>
                          {item.sub ? <span className="block text-meta text-ink-3">{item.sub}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td className="tabular hidden px-3 text-meta text-ink-2 md:table-cell">{item.waiting}</td>
                    <td className="hidden px-3 text-meta text-ink-2 md:table-cell">{item.deadline ?? "—"}</td>
                    <td className="px-4 text-right">
                      <Link href={item.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        {item.action}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-title-3 text-ink">{t.none}</p>
              <p className="mt-1 text-body text-ink-2">{t.noneText}</p>
            </div>
          )}
        </section>
        <p className="text-meta text-ink-3">{t.liveNote}</p>
      </div>
      <aside className="flex flex-col gap-6 xl:border-l xl:border-line xl:pl-6">
        <section>
          <h2 className="mb-3 text-micro font-semibold tracking-[0.06em] text-ink-2 uppercase">{t.today}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Tile label={t.tripsLive} value={data.live} />
            <Tile label={t.withoutTruck} value={data.noTruck} sub={data.oldest ? t.oldest.replace("{t}", data.oldest) : null} tone="warn" />
            <Tile label={t.approvalsWaiting} value={data.approvals} />
            <Tile label={t.payoutsFailed} value={data.failed} tone="warn" />
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-micro font-semibold tracking-[0.06em] text-ink-2 uppercase">{t.onCall}</h2>
          <ul className="flex flex-col gap-3">
            {(onCall ?? []).map((s) => {
              const person = (s.person as { full_name?: string } | null)?.full_name ?? "";
              return (
                <li key={s.user_id} className="flex items-center gap-3">
                  <Avatar name={person} size={36} className="bg-green-900 text-white" />
                  <span>
                    <span className="block text-body-sm font-semibold text-ink">{person}</span>
                    <span className="block text-caption text-ink-3">{s.role === "super_admin" ? `${t.escalation} · ${messages.auth.staff.roles.super_admin}` : messages.auth.staff.roles[s.role as keyof typeof messages.auth.staff.roles]}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function Spark({ points, warn }: { points: number[]; warn?: boolean }) {
  const max = Math.max(1, ...points);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i / Math.max(1, points.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  return (
    <svg aria-hidden viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-7 w-full">
      <path d={d} fill="none" stroke={warn ? "var(--color-warning)" : "var(--color-green-700)"} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const perDay = (rows: { at: string | null }[], now: number) => {
  const days = Array.from({ length: 7 }, (_, i) => lagosDay(new Date(now - (6 - i) * 86_400_000)));
  return days.map((day) => rows.filter((r) => r.at && lagosDay(new Date(r.at)) === day).length);
};

export async function StaffOverview({ now }: { now: number }) {
  const o = t.overview;
  const supabase = await supabaseServer();
  const week = dayStart(6, now);
  const today = dayStart(0, now);
  const [trips, delivered, funded, noTruck, payouts, held, signups, corridors, docs] = await Promise.all([
    supabase.from("trips").select("created_at").gte("created_at", week).limit(5000),
    supabase.from("trips").select("delivered_at").gte("delivered_at", week).limit(5000),
    supabase.from("loads").select("funded_at, total_kobo").gte("funded_at", week).eq("is_demo", false).limit(5000),
    supabase.from("loads").select("funded_at").eq("status", "funded").eq("is_demo", false).order("funded_at").limit(500),
    supabase.from("payouts").select("paid_at, amount_kobo").eq("status", "paid").gte("paid_at", week).limit(5000),
    supabase.from("loads").select("total_kobo").in("status", ["funded", "matched"] as never[]).eq("is_demo", false).limit(5000),
    supabase.from("profiles").select("joining_as, created_at").gte("created_at", week).limit(5000),
    supabase.from("corridors").select("id, name").eq("active", true).order("name"),
    supabase.from("documents").select("status").gte("updated_at", week).in("status", ["approved", "rejected"] as never[]).limit(5000),
  ]);
  const todays = <T extends Record<string, unknown>>(rows: T[] | null, key: keyof T) => (rows ?? []).filter((r) => typeof r[key] === "string" && (r[key] as string) >= today);
  const fundedToday = todays(funded.data, "funded_at");
  const payoutsToday = todays(payouts.data, "paid_at");
  const heldKobo = (held.data ?? []).reduce((s, l) => s + (l.total_kobo ?? 0), 0);
  const join = (kind: string) => (signups.data ?? []).filter((p) => (p.joining_as ?? "").includes(kind)).length;
  const decided = docs.data ?? [];
  const rate = decided.length ? Math.round((decided.filter((d) => d.status === "approved").length / decided.length) * 100) : null;
  const { data: weekTrips } = await supabase.from("trips").select("load:load_id(corridor_id, freight_kobo)").gte("created_at", week).limit(5000);
  const byCorridor = new Map<string, { n: number; freight: number }>();
  for (const row of weekTrips ?? []) {
    const load = row.load as { corridor_id?: string; freight_kobo?: number } | null;
    if (!load?.corridor_id) continue;
    const c = byCorridor.get(load.corridor_id) ?? { n: 0, freight: 0 };
    byCorridor.set(load.corridor_id, { n: c.n + 1, freight: c.freight + (load.freight_kobo ?? 0) });
  }
  const oldest = noTruck.data?.[0]?.funded_at;
  const kpis = [
    { label: o.tripsStarted, value: todays(trips.data, "created_at").length, spark: perDay((trips.data ?? []).map((r) => ({ at: r.created_at })), now) },
    { label: o.tripsDelivered, value: todays(delivered.data, "delivered_at").length, spark: perDay((delivered.data ?? []).map((r) => ({ at: r.delivered_at })), now) },
    { label: o.loadsFunded, value: fundedToday.length, sub: compact(fundedToday.reduce((s, l) => s + (l.total_kobo ?? 0), 0)), spark: perDay((funded.data ?? []).map((r) => ({ at: r.funded_at })), now) },
    { label: o.withoutTruck, value: noTruck.data?.length ?? 0, sub: oldest ? t.oldest.replace("{t}", ago(oldest, now)) : undefined, warn: true },
    { label: o.moneyHeld, value: compact(heldKobo), sub: o.loads.replace("{n}", String(held.data?.length ?? 0)) },
    { label: o.payoutsSent, value: compact(payoutsToday.reduce((s, p) => s + p.amount_kobo, 0)), sub: o.payouts.replace("{n}", String(payoutsToday.length)), spark: perDay((payouts.data ?? []).map((r) => ({ at: r.paid_at })), now) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-4 text-body text-ink-2">{o.updated.replace("{date}", new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(new Date(now)))}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-card border border-line bg-surface p-4">
            <p className="text-meta text-ink-2">{k.label}</p>
            <p className="tabular mt-2 text-[24px] leading-none font-semibold text-ink">{k.value}</p>
            {k.sub ? <p className={cn("mt-2 text-caption", k.warn ? "text-warning" : "text-ink-3")}>{k.sub}</p> : null}
            {k.spark ? <Spark points={k.spark} warn={k.warn} /> : null}
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-card border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3.5 text-title-3 text-ink">{o.attention}</h2>
          <ul>
            {noTruck.data?.length ? (
              <li className="flex items-center gap-3 border-b border-line-soft px-4 py-3 text-body text-ink">
                <AlertTriangle aria-hidden className="size-4.5 text-warning" strokeWidth={1.75} />
                <Link href="/admin/loads" className="flex-1">
                  {`${o.withoutTruck} · ${noTruck.data.length}`}
                </Link>
              </li>
            ) : null}
            {!noTruck.data?.length ? <li className="px-4 py-6 text-body text-ink-2">{o.attentionNone}</li> : null}
          </ul>
        </section>
        <section className="rounded-card border border-line bg-surface px-4 py-3.5">
          <h2 className="text-title-3 text-ink">{o.week}</h2>
          <dl className="mt-2">
            {[
              [o.signSenders, join("shipper")],
              [o.signOwners, join("transporter")],
              [o.signDrivers, join("driver")],
              [o.approvalRate, rate === null ? "—" : `${rate}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between border-b border-line-soft py-3 last:border-b-0">
                <dt className="text-body text-ink">{label}</dt>
                <dd className="tabular text-body font-semibold text-ink">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <dt className="text-body text-ink">{o.whatsapp}</dt>
              <dd className="rounded-pill bg-line-soft px-2.5 py-1 text-caption font-semibold text-ink-2">{o.whatsappOff}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section>
        <h2 className="mb-3 text-title-3 text-ink">{o.corridors}</h2>
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b border-line text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
              <tr>
                <th className="px-4 py-3">{o.corridor}</th>
                <th className="px-4 py-3">{o.tripsWeek}</th>
                <th className="px-4 py-3">{o.avgFreight}</th>
              </tr>
            </thead>
            <tbody>
              {(corridors.data ?? []).map((c) => {
                const s = byCorridor.get(c.id);
                return (
                  <tr key={c.id} className="border-b border-line-soft last:border-b-0 text-body">
                    <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                    <td className="tabular px-4 py-3 text-ink-2">{s?.n ?? 0}</td>
                    <td className="tabular px-4 py-3 text-ink-2">{s?.n ? compact(s.freight / s.n) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** X00k: a console page outside the staff member's role. */
export function NoAccess({ page }: { page: StaffPage }) {
  const names = messages.auth.staff.roles;
  const roles = staffPageRoles[page].map((r) => names[r].toLowerCase());
  const list = roles.length > 1 ? `${roles.slice(0, -1).join(", ")} and ${roles.at(-1)}` : roles[0];
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-line-soft text-ink-2">
        <ShieldCheck aria-hidden className="size-7" strokeWidth={1.75} />
      </span>
      <h1 className="text-title-1 text-ink">{t.noAccess.title}</h1>
      <p className="text-body text-ink-2">{t.noAccess.text.replace("{page}", messages.shell.staff.pages[page]).replace("{roles}", list)}</p>
      <Link href="/admin/work" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "mt-2")}>
        {t.noAccess.back}
      </Link>
    </div>
  );
}
