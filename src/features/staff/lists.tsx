import Link from "next/link";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// X04 loads, X06 users and companies, X15 catalogue and X16 corridors and lane prices: read-only lists
// from the database (staff read through is_staff()). Editing the catalogue and lane prices goes through
// settings-style approvals in a later slice; finding a truck for a load is the owner's load board.

const t = messages.staffLists;
const when = (d: string | null | undefined) => (d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(d)) : "—");
const naira = (kobo: number | null | undefined) => (kobo == null ? "—" : new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(Math.round(kobo / 100)));
const card = "overflow-x-auto rounded-card border border-line bg-surface";
const th = "px-4 py-3 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase";
type Named = { name?: string } | null;

function Lead({ children }: { children: string }) {
  return <p className="-mt-4 mb-5 text-body text-ink-2">{children}</p>;
}
function Chips({ base, current, options }: { base: string; current: string; options: Record<string, string> }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {Object.entries(options).map(([value, label]) => (
        <Link key={value} href={`${base}?view=${value}`} aria-current={current === value ? "page" : undefined} className={cn("inline-flex h-9 items-center rounded-pill border px-4 text-body-sm font-semibold", current === value ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink")}>
          {label}
        </Link>
      ))}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="px-6 py-10 text-center text-body text-ink-2">{text}</p>;
}

const LOAD_VIEWS: Record<string, string[]> = { finding: ["funded"], awaiting: ["awaiting_payment"], matched: ["matched"], closed: ["cancelled", "expired", "refunded"] };
const loadTone = (s: string): StatusTone => (s === "funded" ? "warning" : s === "matched" ? "success" : s === "awaiting_payment" ? "info" : "neutral");

export async function StaffLoads({ view = "finding" }: { view?: string }) {
  const supabase = await supabaseServer();
  const statuses = LOAD_VIEWS[view] ?? LOAD_VIEWS.finding;
  const { data: loads } = await supabase
    .from("loads")
    .select("id, ref, status, total_kobo, offer_total_kobo, funded_at, pickup_from, weight_kg, is_demo, shipper:shipper_org_id(name), from:from_city_id(name), to:to_city_id(name), type:truck_type_id(name)")
    .in("status", statuses as never[])
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <div className="flex flex-col">
      <Lead>{t.loads.lead}</Lead>
      <Chips base="/admin/loads" current={view} options={t.loads.views} />
      <div className={card}>
        {loads?.length ? (
          <table className="w-full min-w-[900px] text-left text-body-sm">
            <thead className="border-b border-line">
              <tr>
                {(["ref", "status", "route", "sender", "truck", "pickup", "paid"] as const).map((c) => (
                  <th key={c} className={th}>
                    {t.loads.cols[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.id} className="border-b border-line-soft last:border-b-0">
                  <td className="tabular px-4 py-3 font-semibold text-ink">
                    {l.ref}
                    {l.is_demo ? <span className="ml-2 text-caption font-normal text-ink-3">{t.demo}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip tone={loadTone(l.status)}>{t.loads.status[l.status as keyof typeof t.loads.status] ?? l.status}</StatusChip>
                    {l.funded_at && l.status === "funded" ? <span className="mt-1 block text-caption text-ink-3">{t.loads.since.replace("{when}", when(l.funded_at))}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {(l.from as Named)?.name} → {(l.to as Named)?.name}
                  </td>
                  <td className="px-4 py-3 text-ink">{(l.shipper as Named)?.name}</td>
                  <td className="px-4 py-3 text-ink">{[l.weight_kg ? `${Math.round(l.weight_kg / 1000)} t` : null, (l.type as Named)?.name].filter(Boolean).join(" · ")}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{when(l.pickup_from)}</td>
                  <td className="tabular px-4 py-3 text-ink">{naira(l.total_kobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text={t.none} />
        )}
      </div>
    </div>
  );
}

const orgTone = (s: string): StatusTone => (s === "active" ? "success" : s === "blocked" || s === "suspended" ? "danger" : "neutral");

export async function StaffUsers({ view = "transporter", q }: { view?: string; q?: string }) {
  const supabase = await supabaseServer();
  let query = supabase.from("organizations").select("id, name, kind, status, tier, created_at, is_demo, city:home_city_id(name)").eq("kind", (view === "shipper" ? "shipper" : "transporter") as never).order("created_at", { ascending: false }).limit(50);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const { data: orgs } = await query;
  return (
    <div className="flex flex-col">
      <Lead>{t.users.lead}</Lead>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Chips base="/admin/users" current={view} options={t.users.views} />
        <form action="/admin/users" className="flex gap-2">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="org-q" className="sr-only">
            {t.users.search}
          </label>
          <input id="org-q" name="q" defaultValue={q} placeholder={t.users.search} className="h-9 w-52 rounded-pill border border-line bg-surface px-4 text-body-sm outline-none focus:border-green-700" />
        </form>
      </div>
      <div className={card}>
        {orgs?.length ? (
          <table className="w-full min-w-[720px] text-left text-body-sm">
            <thead className="border-b border-line">
              <tr>
                {(["name", "status", "tier", "city", "joined"] as const).map((c) => (
                  <th key={c} className={th}>
                    {t.users.cols[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-line-soft last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {o.name}
                    {o.is_demo ? <span className="ml-2 text-caption font-normal text-ink-3">{t.demo}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip tone={orgTone(o.status)}>{o.status}</StatusChip>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{o.tier ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{(o.city as Named)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{when(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text={t.none} />
        )}
      </div>
    </div>
  );
}

export async function StaffCatalogue() {
  const supabase = await supabaseServer();
  const [{ data: goods }, { data: trucks }] = await Promise.all([
    supabase.from("goods_categories").select("id, code, name, active, is_banned, needs_seal, handling_note").order("name"),
    supabase.from("truck_types").select("id, code, name, active, capacity_kg_min, capacity_kg_max").order("sort_order"),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <Lead>{t.catalogue.lead}</Lead>
      <section>
        <h2 className="mb-3 text-title-3 text-ink">{t.catalogue.goods}</h2>
        <div className={card}>
          <table className="w-full min-w-[640px] text-left text-body-sm">
            <tbody>
              {(goods ?? []).map((g) => (
                <tr key={g.id} className="border-b border-line-soft last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-ink">{g.name}</td>
                  <td className="px-4 py-3 text-ink-2">{g.handling_note ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex gap-1.5">
                      {g.is_banned ? <StatusChip tone="danger">{t.catalogue.banned}</StatusChip> : null}
                      {g.needs_seal ? <StatusChip tone="info">{t.catalogue.seal}</StatusChip> : null}
                      <StatusChip tone={g.active ? "success" : "neutral"}>{g.active ? t.catalogue.on : t.catalogue.off}</StatusChip>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-title-3 text-ink">{t.catalogue.trucks}</h2>
        <div className={card}>
          <table className="w-full min-w-[520px] text-left text-body-sm">
            <tbody>
              {(trucks ?? []).map((tt) => (
                <tr key={tt.id} className="border-b border-line-soft last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-ink">{tt.name}</td>
                  <td className="tabular px-4 py-3 text-ink-2">{`${Math.round((tt.capacity_kg_min ?? 0) / 1000)}–${Math.round((tt.capacity_kg_max ?? 0) / 1000)} t`}</td>
                  <td className="px-4 py-3 text-right">
                    <StatusChip tone={tt.active ? "success" : "neutral"}>{tt.active ? t.catalogue.on : t.catalogue.off}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export async function StaffCorridors() {
  const supabase = await supabaseServer();
  const [{ data: corridors }, { data: lanes }] = await Promise.all([
    supabase.from("corridors").select("id, name, distance_km, typical_hours, active").order("name"),
    supabase.from("lane_prices").select("id, corridor_id, base_kobo, per_km_kobo, min_kobo, valid_from, valid_until, type:truck_type_id(name), from:from_city_id(name), to:to_city_id(name)").is("valid_until", null).limit(400),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <Lead>{t.corridors.lead}</Lead>
      {(corridors ?? []).map((c) => {
        const rows = (lanes ?? []).filter((l) => l.corridor_id === c.id);
        return (
          <section key={c.id}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <h2 className="text-title-3 text-ink">{c.name}</h2>
              <p className="text-meta text-ink-3">{t.corridors.meta.replace("{km}", String(c.distance_km)).replace("{h}", String(c.typical_hours))}</p>
              {c.active ? null : <StatusChip tone="neutral">{t.catalogue.off}</StatusChip>}
            </div>
            <div className={card}>
              {rows.length ? (
                <table className="w-full min-w-[640px] text-left text-body-sm">
                  <thead className="border-b border-line">
                    <tr>
                      {(["lane", "truck", "base", "perKm", "min"] as const).map((k) => (
                        <th key={k} className={th}>
                          {t.corridors.cols[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id} className="border-b border-line-soft last:border-b-0">
                        <td className="px-4 py-3 text-ink">
                          {(l.from as Named)?.name} → {(l.to as Named)?.name}
                        </td>
                        <td className="px-4 py-3 text-ink-2">{(l.type as Named)?.name}</td>
                        <td className="tabular px-4 py-3 text-ink">{naira(l.base_kobo)}</td>
                        <td className="tabular px-4 py-3 text-ink">{naira(l.per_km_kobo)}</td>
                        <td className="tabular px-4 py-3 text-ink">{naira(l.min_kobo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty text={t.corridors.noPrices} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
