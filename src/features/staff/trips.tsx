import Link from "next/link";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { NoteForm, TakeAction } from "./trip-client";

// X03 trips list and X03b trip page, from the database (staff read through is_staff()). Live map,
// codes, chat, problems and SOS on the trip are Phase 4/5; the codes are never shown to staff.

const t = messages.staffTrips;
const naira = (kobo: number | null | undefined) => (kobo == null ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(kobo / 100)));
const when = (d: string | null | undefined) => (d ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(d)) : "—");
const spaced = (p?: string | null) => (p ?? "").replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived", "transloading"];
const VIEW: Record<string, string[] | null> = { live: LIVE, delivered: ["delivered", "delivered_with_exception", "closed"], cancelled: ["cancelled"], all: null };
const tone = (s: string): StatusTone => (s === "cancelled" ? "neutral" : s === "delivered_with_exception" ? "warning" : ["delivered", "closed"].includes(s) ? "success" : "info");
type Named = { name?: string } | null;

export async function StaffTrips({ view = "live", q }: { view?: string; q?: string }) {
  const supabase = await supabaseServer();
  let query = supabase
    .from("trips")
    .select("id, ref, status, created_at, driver:driver_id(full_name), owner:transporter_org_id(name), truck:truck_id(plate_number), load:load_id(total_kobo, pickup_from, shipper:shipper_org_id(name), from:from_city_id(name), to:to_city_id(name))")
    .order("created_at", { ascending: false })
    .limit(50);
  const statuses = VIEW[view] ?? VIEW.live;
  if (statuses) query = query.in("status", statuses as never[]);
  if (q) query = query.ilike("ref", `%${q.replace(/[^A-Za-z0-9-]/g, "")}%`);
  const { data: trips } = await query;
  return (
    <div className="flex flex-col gap-4">
      <p className="-mt-4 text-body text-ink-2">{t.lead}</p>
      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(VIEW).map((v) => (
          <Link key={v} href={`/admin/trips?view=${v}`} aria-current={view === v ? "page" : undefined} className={cn("inline-flex h-9 items-center rounded-pill border px-4 text-body-sm font-semibold", view === v ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink")}>
            {t.views[v as keyof typeof t.views]}
          </Link>
        ))}
        <form action="/admin/trips" className="ml-auto flex gap-2">
          <input type="hidden" name="view" value={view} />
          <label className="sr-only" htmlFor="trip-ref">
            {t.search}
          </label>
          <input id="trip-ref" name="q" defaultValue={q} placeholder={t.search} className="h-9 w-44 rounded-pill border border-line bg-surface px-4 text-body-sm outline-none focus:border-green-700" />
          <button type="submit" className="h-9 rounded-pill border border-line bg-surface px-4 text-body-sm font-semibold text-ink">
            {t.find}
          </button>
        </form>
      </div>
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        {trips?.length ? (
          <table className="w-full min-w-[960px] text-left text-body-sm">
            <thead className="border-b border-line text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
              <tr>
                {(["ref", "status", "route", "sender", "owner", "truck", "pickup", "paid"] as const).map((c) => (
                  <th key={c} className="px-3 py-3 first:pl-4">
                    {t.cols[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const load = trip.load as { total_kobo?: number; pickup_from?: string; shipper?: Named; from?: Named; to?: Named } | null;
                return (
                  <tr key={trip.id} className="border-b border-line-soft last:border-b-0">
                    <td className="py-3 pr-3 pl-4">
                      <Link href={`/admin/trips?trip=${trip.id}`} className="tabular font-semibold text-ink underline-offset-2 hover:underline">
                        {trip.ref}
                      </Link>
                    </td>
                    <td className="px-3">
                      <StatusChip tone={tone(trip.status)}>{t.status[trip.status as keyof typeof t.status] ?? trip.status}</StatusChip>
                    </td>
                    <td className="px-3 text-ink">
                      {load?.from?.name} → {load?.to?.name}
                    </td>
                    <td className="px-3 text-ink">{load?.shipper?.name}</td>
                    <td className="px-3 text-ink">{(trip.owner as Named)?.name}</td>
                    <td className="px-3 text-ink">
                      <span className="font-semibold">{spaced((trip.truck as { plate_number?: string } | null)?.plate_number)}</span>
                      {(trip.driver as { full_name?: string } | null)?.full_name ? ` · ${(trip.driver as { full_name?: string }).full_name}` : ""}
                    </td>
                    <td className="px-3 whitespace-nowrap text-ink-2">{when(load?.pickup_from)}</td>
                    <td className="tabular px-3 text-ink">{naira(load?.total_kobo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-title-3 text-ink">{t.none}</p>
            <p className="mt-1 text-body text-ink-2">{t.noneText}</p>
          </div>
        )}
      </div>
      <p className="text-meta text-ink-3">{t.showing.replace("{n}", String(trips?.length ?? 0))}</p>
    </div>
  );
}

export async function StaffTrip({ id, canAct }: { id: string; canAct: boolean }) {
  const supabase = await supabaseServer();
  const { data: trip } = await supabase
    .from("trips")
    .select("id, ref, status, load_id, loaded_at, delivered_at, driver:driver_id(full_name, phone), owner:transporter_org_id(name), truck:truck_id(plate_number), load:load_id(total_kobo, fee_kobo, weight_kg, quantity, quantity_unit, created_by, goods:goods_category_id(name), shipper:shipper_org_id(name), from:from_city_id(name), to:to_city_id(name))")
    .eq("id", id)
    .maybeSingle();
  if (!trip) return <p className="text-body text-ink-2">{t.none}</p>;
  const load = trip.load as { total_kobo?: number; fee_kobo?: number; weight_kg?: number; quantity?: number; quantity_unit?: string; created_by?: string; goods?: Named; shipper?: Named; from?: Named; to?: Named } | null;
  const [{ data: events }, { data: payouts }, { data: payments }, { data: booker }] = await Promise.all([
    supabase.from("trip_events").select("id, type, actor_kind, payload, created_at, actor:actor_user_id(full_name)").eq("trip_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("payouts").select("kind, amount_kobo, status").eq("trip_id", id),
    supabase.from("payments").select("received_kobo, status").eq("load_id", trip.load_id),
    load?.created_by ? supabase.from("profiles").select("full_name, phone").eq("id", load.created_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const paid = (payments ?? []).filter((p) => p.status !== "failed" && p.status !== "expired").reduce((s, p) => s + (p.received_kobo ?? 0), 0);
  const payout = (kind: string) => (payouts ?? []).find((p) => p.kind === kind);
  const driver = trip.driver as { full_name?: string; phone?: string } | null;
  const ev = messages.staffTrips.events;
  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <nav className="-mt-3 text-meta text-ink-3">
          <Link href="/admin/trips" className="font-semibold text-ink">
            {t.back}
          </Link>{" "}
          / {trip.ref}
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tabular text-console-title text-ink">{trip.ref}</h1>
              <StatusChip tone={tone(trip.status)}>{t.status[trip.status as keyof typeof t.status] ?? trip.status}</StatusChip>
            </div>
            <p className="mt-1 max-w-xl text-body text-ink-2">
              {[`${load?.from?.name} → ${load?.to?.name}`, load?.goods?.name, load?.weight_kg ? `${Math.round(load.weight_kg / 1000)} t` : null, booker?.full_name ? t.booked.replace("{name}", booker.full_name) : null].filter(Boolean).join(" · ")}
            </p>
          </div>
          {canAct ? <TakeAction tripId={trip.id} status={trip.status} /> : null}
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-card border border-line bg-surface p-4">
            <h2 className="mb-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">{t.timeline}</h2>
            <ol>
              {(events ?? []).map((e) => {
                const payload = e.payload as { reason?: string; note?: string } | null;
                return (
                  <li key={e.id} className="grid grid-cols-[88px_1fr] gap-3 border-b border-line-soft py-3 last:border-b-0">
                    <span className="tabular text-meta text-ink-3">{when(e.created_at)}</span>
                    <span>
                      <span className="block text-body font-semibold text-ink">{ev[e.type as keyof typeof ev] ?? e.type.replace(/[._]/g, " ")}</span>
                      <span className="block text-meta text-ink-3">{[(e.actor as { full_name?: string } | null)?.full_name, e.actor_kind, payload?.reason ?? payload?.note].filter(Boolean).join(" · ")}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
          <div className="flex flex-col gap-4">
            <section className="rounded-card border border-line bg-surface p-4">
              <h2 className="mb-1 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">{t.money}</h2>
              <dl>
                {[
                  [t.senderPaid, naira(paid)],
                  [t.advance, payout("advance") ? `${naira(payout("advance")?.amount_kobo)} · ${payout("advance")?.status}` : t.notYet],
                  [t.balance, payout("balance") ? `${naira(payout("balance")?.amount_kobo)} · ${payout("balance")?.status}` : t.notYet],
                  [t.fees, naira(load?.fee_kobo)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0">
                    <dt className="text-body-sm text-ink">{label}</dt>
                    <dd className="tabular text-body-sm font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-card border border-line bg-surface p-4">
              <h2 className="mb-1 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">{t.codes}</h2>
              <p className="text-meta text-ink-2">{t.codesText}</p>
            </section>
          </div>
        </div>
      </div>
      <aside className="flex flex-col gap-5 xl:border-l xl:border-line xl:pl-6">
        <section>
          <h2 className="mb-3 text-micro font-semibold tracking-[0.06em] text-ink-2 uppercase">{t.people}</h2>
          <dl className="flex flex-col gap-3">
            {[
              [t.sender, [load?.shipper?.name, booker?.full_name].filter(Boolean).join(" · "), booker?.phone],
              [t.owner, (trip.owner as Named)?.name, null],
              [t.driver, [driver?.full_name, spaced((trip.truck as { plate_number?: string } | null)?.plate_number)].filter(Boolean).join(" · "), driver?.phone],
            ].map(([label, name, phone]) => (
              <div key={String(label)} className="border-b border-line-soft pb-3 last:border-b-0">
                <dt className="text-meta text-ink-3">{label}</dt>
                <dd className="text-body-sm font-semibold text-ink">{name || "—"}</dd>
                {phone ? (
                  <dd>
                    <a href={`tel:${phone}`} className="tabular text-body-sm text-green-800">
                      {phone}
                    </a>
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2 className="mb-3 text-micro font-semibold tracking-[0.06em] text-ink-2 uppercase">{t.activity}</h2>
          <NoteForm tripId={trip.id} />
        </section>
      </aside>
    </div>
  );
}
