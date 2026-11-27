import { Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { Listen } from "./listen";

// DV31 history, DV33 notifications and DV34 help for drivers. No money anywhere (D003); ratings and
// trip proof come with the trip steps (Phase 4/5).

const lagos = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "Africa/Lagos" }).format(new Date(d));

function dayKeys() {
  const now = Date.now();
  return { today: lagos(new Date(now).toISOString(), { dateStyle: "short" }), yesterday: lagos(new Date(now - 86_400_000).toISOString(), { dateStyle: "short" }) };
}

async function me() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return { supabase, id: (data?.claims?.sub as string) ?? "" };
}

export async function DriverHistory({ viewer }: { viewer: Promise<Viewer> }) {
  await viewer;
  const t = messages.driverTrip;
  const { supabase, id } = await me();
  const { data: trips } = await supabase
    .from("trips")
    .select("id, status, delivered_at, status_changed_at, created_at")
    .eq("driver_id", id)
    .in("status", ["delivered", "closed", "cancelled"] as never[])
    .order("created_at", { ascending: false })
    .limit(40);
  if (!trips?.length) return <EmptyState title={t.historyEmpty} className="pt-16">{t.historyEmptyText}</EmptyState>;
  const maps = await Promise.all(trips.map((trip) => supabase.rpc("trip_map", { p_trip: trip.id }).then((r) => r.data?.[0])));
  const rows = trips.map((trip, i) => ({ trip, map: maps[i], when: trip.delivered_at ?? trip.status_changed_at }));
  const months = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = lagos(row.when, { month: "long", year: "numeric" });
    months.set(key, [...(months.get(key) ?? []), row]);
  }
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      {[...months].map(([month, list]) => (
        <section key={month} className="flex flex-col gap-2.5">
          <h2 className="text-meta font-semibold tracking-[0.06em] text-ink-3 uppercase">{month}</h2>
          <ul className="rounded-card border border-line bg-surface px-4.5">
            {list.map(({ trip, map, when }) => (
              <li key={trip.id} className="flex min-h-17 items-center gap-3 border-t border-line-soft py-3 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold text-ink">{map ? `${map.from_city} → ${map.to_city}` : ""}</span>
                  <span className="block text-meta text-ink-3">{[lagos(when, { day: "numeric", month: "short" }), map?.ref].filter(Boolean).join(" · ")}</span>
                </span>
                <StatusChip tone={trip.status === "cancelled" ? "neutral" : "success"}>{t.status[trip.status as keyof typeof t.status]}</StatusChip>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export async function DriverNotifications({ viewer }: { viewer: Promise<Viewer> }) {
  await viewer;
  const t = messages.driverNotes;
  const { supabase, id } = await me();
  const [{ data: notes }, { data: replies }] = await Promise.all([
    supabase.from("notifications").select("id, event, template_code, created_at, read_at").eq("user_id", id).neq("template_code", "owner_reply").order("created_at", { ascending: false }).limit(40),
    supabase.from("driver_messages").select("id, org_id, reply, replied_at").eq("driver_id", id).not("reply", "is", null).order("replied_at", { ascending: false }).limit(20),
  ]);
  const orgIds = [...new Set((replies ?? []).map((r) => r.org_id))];
  const { data: orgs } = orgIds.length ? await supabase.from("organizations").select("id, name").in("id", orgIds) : { data: [] };
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const items = [
    ...(notes ?? []).map((n) => ({ id: n.id, at: n.created_at, unread: !n.read_at, text: t.events[n.template_code as keyof typeof t.events] ?? t.events[n.event as keyof typeof t.events] ?? t.update })),
    ...(replies ?? []).map((r) => ({ id: r.id, at: r.replied_at as string, unread: false, text: t.reply.replace("{org}", orgName.get(r.org_id) ?? "").replace("{text}", r.reply ?? "") })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (!items.length) return <EmptyState title={t.empty} className="pt-16">{t.emptyText}</EmptyState>;
  const { today, yesterday } = dayKeys();
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const d = lagos(item.at, { dateStyle: "short" });
    const key = d === today ? t.today : d === yesterday ? t.yesterday : t.earlier;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      {[...groups].map(([label, list]) => (
        <section key={label} className="flex flex-col gap-2.5">
          <h2 className="text-meta font-semibold tracking-[0.06em] text-ink-3 uppercase">{label}</h2>
          <ul className="rounded-card border border-line bg-surface px-4.5">
            {list.map((item) => (
              <li key={item.id} className="flex items-start gap-3 border-t border-line-soft py-3.5 first:border-t-0">
                <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", item.unread ? "bg-green-700" : "bg-transparent")} />
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold text-ink">{item.text}</span>
                  <span className="block text-meta text-ink-3">{lagos(item.at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-center text-meta text-ink-3">{t.waitNote}</p>
    </div>
  );
}

export function DriverHelp() {
  const t = messages.driverHelp;
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <h1 className="text-title-1 text-ink">{t.title}</h1>
      <ul className="flex flex-wrap gap-2">
        {t.topics.map((topic) => (
          <li key={topic} className="rounded-pill border border-line bg-surface px-4 py-2.5 text-body font-semibold text-ink">
            {topic}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-3">
        {t.questions.map((item) => (
          <li key={item.q} className="rounded-card border border-line bg-surface p-4.5">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[17px] font-semibold text-ink">{item.q}</summary>
              <p className="mt-2.5 text-[17px] text-ink-2">{item.a}</p>
            </details>
            <div className="mt-3">
              <Listen text={`${item.q}. ${item.a}`} />
            </div>
          </li>
        ))}
      </ul>
      {phone ? (
        <section className="flex items-center justify-between gap-3 rounded-card bg-green-900 p-4.5 text-white">
          <span>
            <span className="block text-[17px] font-semibold">{t.talk}</span>
            <span className="block text-meta text-green-200">{t.hours}</span>
          </span>
          <a href={`tel:${phone}`} className={cn(buttonVariants({ variant: "secondary", size: "md" }), "border-white/30 bg-transparent text-white hover:bg-white/10")}>
            <Phone aria-hidden className="size-4.5" strokeWidth={1.8} />
            {t.call}
          </a>
        </section>
      ) : null}
    </div>
  );
}
