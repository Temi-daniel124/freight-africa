import { Camera, Check, ChevronRight, FileText, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { TruckGraphic, truckKind } from "@/components/art/truck";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { FleetTruck } from "@/features/home/owner-home";
import type { Viewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// O18 / OD08 trucks and O20 / OD12 papers (sorted by what needs the owner first).

const f = messages.fleet;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const spaced = (p: string) => p.replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");
const date = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(`${d}T12:00:00+01:00`)).replace(",", "");

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}
function daysUntil(d: string) {
  return Math.round((new Date(`${d}T12:00:00+01:00`).getTime() - Date.now()) / 86400000);
}

type Doc = { id: string; subject_kind: string; subject_id: string; status: string; expires_on: string | null; review_note: string | null; doc_type: { name: string } | null };

async function papers(orgId: string) {
  const { data } = await (await supabaseServer()).from("documents").select("id, subject_kind, subject_id, status, expires_on, review_note, doc_type:document_types(name)").eq("org_id", orgId);
  return (data ?? []) as unknown as Doc[];
}

export async function OwnerTrucks({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId, fullName } = await viewer;
  const add = (
    <Link href="/app/haul/trucks/new" className={buttonVariants({ size: "sm" })}>
      <Plus aria-hidden strokeWidth={1.8} />
      {f.add}
    </Link>
  );
  if (!orgId) return null;
  const supabase = await supabaseServer();
  const [{ data: fleet }, docs, { data: extra }] = await Promise.all([
    supabase.rpc("fleet", { p_org: orgId }),
    papers(orgId),
    supabase.from("trucks").select("id, tracker_device_id").eq("org_id", orgId),
  ]);
  const trucks = (fleet ?? []) as FleetTruck[];
  if (!trucks.length) {
    return (
      <section className="rounded-card border border-line bg-surface">
        <EmptyState title={messages.trucks.list.empty} action={add}>
          {messages.trucks.list.emptyText}
        </EmptyState>
      </section>
    );
  }
  const tracker = new Set((extra ?? []).filter((x) => x.tracker_device_id).map((x) => x.id));
  const now = today();
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3">
      <div className="flex justify-end">{add}</div>
      <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {trucks.map((x) => {
          const mine = docs.filter((d) => d.subject_kind === "truck" && d.subject_id === x.truck_id && d.status !== "rejected");
          const soonest = mine.filter((d) => d.expires_on).sort((a, b) => (a.expires_on! < b.expires_on! ? -1 : 1))[0];
          const pills: { text: string; tone: StatusTone }[] = [];
          if (x.trip_id) pills.push({ text: x.weight_kg ? fill(f.onTripFull, { p: Math.round((x.weight_kg / x.capacity_kg) * 100) }) : f.onTrip, tone: "info" });
          else if (x.status === "active" && x.availability !== "unavailable") pills.push({ text: f.available, tone: "success" });
          else pills.push({ text: x.status === "draft" ? f.draft : x.status === "pending_review" ? f.review : f.paused, tone: x.status === "draft" ? "danger" : "warning" });
          if (soonest?.expires_on && soonest.expires_on < now) pills.push({ text: fill(f.paperExpired, { paper: soonest.doc_type?.name ?? "" }), tone: "danger" });
          else if (soonest?.expires_on && daysUntil(soonest.expires_on) <= 30) pills.push({ text: daysUntil(soonest.expires_on) <= 0 ? fill(f.paperEndsToday, { paper: soonest.doc_type?.name ?? "" }) : fill(f.paperEnds, { paper: soonest.doc_type?.name ?? "", n: daysUntil(soonest.expires_on) }), tone: "warning" });
          else if (mine.length) pills.push({ text: f.papersOk, tone: "success" });
          if (tracker.has(x.truck_id)) pills.push({ text: f.gps, tone: "neutral" });
          const driver = x.driver_name ? (x.driver_name === fullName ? f.youDrive : x.driver_name) : f.noDriver;
          return (
            <li key={x.truck_id}>
              <Link href={`/app/haul/trucks/${x.truck_id}`} className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-4 hover:border-green-700/40">
                <span className="grid h-16 w-18 shrink-0 place-items-center overflow-hidden rounded-tile bg-green-50 px-1.5">
                  <TruckGraphic kind={truckKind(x.truck_type_code)} load={null} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tabular block text-body font-semibold text-ink">{spaced(x.plate)}</span>
                  <span className="block truncate text-meta text-ink-3">
                    {x.truck_type} {Math.round(x.capacity_kg / 1000)} t · {driver}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {pills.map((p) => (
                      <StatusChip key={p.text} tone={p.tone}>
                        {p.text}
                      </StatusChip>
                    ))}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" strokeWidth={1.8} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function OwnerPapers({ viewer }: { viewer: Promise<Viewer> }) {
  const { orgId } = await viewer;
  if (!orgId) return null;
  const supabase = await supabaseServer();
  const [docs, { data: trucks }, { data: team }, { data: drivers }] = await Promise.all([
    papers(orgId),
    supabase.from("trucks").select("id, plate_number, status").eq("org_id", orgId).neq("status", "retired"),
    supabase.rpc("team_members", { p_org: orgId }),
    supabase.from("drivers").select("user_id, licence_expires_on, status, paused").eq("org_id", orgId),
  ]);
  const plate = new Map((trucks ?? []).map((x) => [x.id, spaced(x.plate_number)]));
  const name = new Map((team ?? []).map((m) => [m.user_id, m.full_name ?? ""]));
  const now = today();
  type Item = { key: string; icon: "truck" | "driver" | "photo"; title: string; sub: string; href: string; group: "expired" | "soon" | "photo" };
  const items: Item[] = [];
  for (const d of docs) {
    const who = d.subject_kind === "truck" ? plate.get(d.subject_id) : name.get(d.subject_id);
    if (!who) continue;
    const title = `${d.doc_type?.name ?? ""} · ${who}`;
    const href = d.subject_kind === "truck" ? `/app/haul/trucks/${d.subject_id}` : "/app/haul/drivers";
    if (d.status === "rejected") items.push({ key: d.id, icon: "photo", title, sub: d.review_note ? `"${d.review_note}"` : f.newPhoto, href, group: "photo" });
    else if (d.expires_on && (d.expires_on < now || d.status === "expired")) items.push({ key: d.id, icon: d.subject_kind === "truck" ? "truck" : "driver", title, sub: `${fill(f.expiredOn, { date: date(d.expires_on) })} · ${d.subject_kind === "truck" ? f.truckPaused : f.driverPaused}`, href, group: "expired" });
    else if (d.expires_on && daysUntil(d.expires_on) <= 30) items.push({ key: d.id, icon: d.subject_kind === "truck" ? "truck" : "driver", title, sub: fill(f.endsOn, { date: date(d.expires_on) }), href, group: "soon" });
  }
  for (const dr of drivers ?? []) {
    if (!dr.licence_expires_on || !name.get(dr.user_id)) continue;
    const title = `${f.driversLicence} · ${name.get(dr.user_id)}`;
    if (dr.licence_expires_on < now) items.push({ key: `lic-${dr.user_id}`, icon: "driver", title, sub: `${fill(f.expiredOn, { date: date(dr.licence_expires_on) })} · ${f.driverPaused}`, href: "/app/haul/drivers", group: "expired" });
    else if (daysUntil(dr.licence_expires_on) <= 30) items.push({ key: `lic-${dr.user_id}`, icon: "driver", title, sub: fill(f.endsOn, { date: date(dr.licence_expires_on) }), href: "/app/haul/drivers", group: "soon" });
  }
  const truckCount = (trucks ?? []).length;
  const driverCount = (drivers ?? []).filter((d) => d.status === "active").length;
  const good = docs.filter((d) => d.status === "approved" && (!d.expires_on || daysUntil(d.expires_on) > 30)).length;
  if (!docs.length && !items.length) {
    return (
      <section className="rounded-card border border-line bg-surface">
        <EmptyState title={f.noPapers}>{f.noPapersText}</EmptyState>
      </section>
    );
  }
  const group = (key: Item["group"], title: string, tone: string) => {
    const list = items.filter((i) => i.group === key);
    if (!list.length) return null;
    return (
      <section>
        <h2 className={cn("mb-2 px-1 text-caption font-semibold tracking-caps uppercase", tone)}>
          {title} · {list.length}
        </h2>
        <ul className="flex flex-col gap-2.5">
          {list.map((i) => (
            <li key={i.key}>
              <Link href={i.href} className={cn("flex items-center gap-3.5 rounded-card border bg-surface p-4", key === "expired" ? "border-danger/30" : "border-line")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon", key === "expired" ? "bg-danger-100 text-danger" : key === "soon" ? "bg-warning-100 text-warning" : "bg-paper text-ink-2")}>
                  {i.icon === "photo" ? <Camera aria-hidden className="size-4.5" strokeWidth={1.8} /> : i.icon === "driver" ? <UserRound aria-hidden className="size-4.5" strokeWidth={1.8} /> : <FileText aria-hidden className="size-4.5" strokeWidth={1.8} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">{i.title}</span>
                  <span className="block text-meta text-ink-3">{i.sub}</span>
                </span>
                {key === "photo" ? (
                  <ChevronRight aria-hidden className="size-5 text-ink-2" strokeWidth={1.8} />
                ) : (
                  <span className={buttonVariants({ size: "sm", variant: key === "expired" ? "primary" : "secondary" })}>{f.replace}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  };
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
      {group("expired", f.expired, "text-danger")}
      {group("soon", f.endingSoon, "text-warning")}
      {group("photo", f.newPhoto, "text-ink-3")}
      {good ? (
        <section>
          <h2 className="mb-2 px-1 text-caption font-semibold tracking-caps text-green-800 uppercase">
            {f.allGood} · {good}
          </h2>
          <Link href="/app/haul/trucks" className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
              <Check aria-hidden className="size-4.5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1 text-body-sm text-ink">{driverCount ? fill(f.allGoodText, { t: truckCount, d: driverCount }) : fill(f.allGoodTrucks, { t: truckCount })}</span>
            <ChevronRight aria-hidden className="size-5 text-ink-2" strokeWidth={1.8} />
          </Link>
        </section>
      ) : null}
      <p className="px-1 text-caption text-ink-3">{f.reminders}</p>
    </div>
  );
}
