import { MapPin } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { Viewer } from "@/features/shell/viewer";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { NightScreen } from "./night";
import { Checklist, TripActions } from "./trip-client";

// DV10 no trip, DV12 the current trip (read-only until the trip steps go live, Phase 4) and DVD01 on a
// computer with a QR code. Everything comes from trip_map, which never returns money to the truck side
// (D003) and gives the next contact's phone only while the trip is live (D018).

const t = messages.driverTrip;
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived"];
const lagos = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "Africa/Lagos" }).format(new Date(d));
const spaced = (p?: string | null) => (p ?? "").replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3");

export type DriverTripView = {
  id: string;
  ref: string;
  status: string;
  from: string;
  to: string;
  pickupFrom: string | null;
  goods: string;
  weightKg: number | null;
  quantity: number | null;
  unit: string | null;
  plate: string;
  contactName: string | null;
  contactPhone: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropLat: number | null;
  dropLng: number | null;
  notes: string | null;
};

async function currentTrip(): Promise<{ trip: DriverTripView | null; org: string | null }> {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const me = (claims?.claims?.sub as string) ?? "";
  const { data: rows } = await supabase.from("trips").select("id, transporter_org_id, status").eq("driver_id", me).in("status", LIVE as never[]).order("created_at").limit(1);
  const row = rows?.[0];
  const { data: driver } = await supabase.from("drivers").select("org_id").eq("user_id", me).maybeSingle();
  const orgId = row?.transporter_org_id ?? driver?.org_id;
  const { data: org } = orgId ? await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle() : { data: null };
  if (!row) return { trip: null, org: org?.name ?? null };
  const { data: map } = await supabase.rpc("trip_map", { p_trip: row.id });
  const m = map?.[0];
  if (!m) return { trip: null, org: org?.name ?? null };
  return {
    org: org?.name ?? null,
    trip: {
      id: row.id,
      ref: m.ref,
      status: m.status,
      from: m.from_city,
      to: m.to_city,
      pickupFrom: m.pickup_from,
      goods: m.goods,
      weightKg: m.weight_kg,
      quantity: m.quantity,
      unit: m.quantity_unit,
      plate: spaced(m.plate),
      contactName: m.next_contact_name,
      contactPhone: m.next_contact_phone,
      pickupLat: m.from_lat,
      pickupLng: m.from_lng,
      dropLat: m.to_lat,
      dropLng: m.to_lng,
      notes: null,
    },
  };
}

function loadsIn(pickup: string | null) {
  if (!pickup) return null;
  const mins = Math.round((new Date(pickup).getTime() - Date.now()) / 60_000);
  if (mins <= 0 || mins > 48 * 60) return t.loadsAt.replace("{when}", lagos(pickup, { weekday: "short", hour: "numeric", minute: "2-digit" }));
  return t.loadsIn.replace("{t}", mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`);
}

function NoTrip({ org }: { org: string | null }) {
  return (
    <EmptyState
      title={t.noTrip}
      className="pt-16"
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/app/drive/next" className={buttonVariants({ variant: "secondary", size: "md" })}>
            {t.seeNext}
          </Link>
          <Link href="/onboarding/gps" className={buttonVariants({ variant: "secondary", size: "md" })}>
            {t.testGps}
          </Link>
        </div>
      }
    >
      {org ? t.noTripText.replace("{org}", org) : t.noTripTextPlain}
    </EmptyState>
  );
}

function Stops({ trip }: { trip: DriverTripView }) {
  const beforeLoading = ["assigned", "to_pickup", "at_pickup", "loading"].includes(trip.status);
  const stop = (kind: "load" | "drop") => {
    const load = kind === "load";
    const who = load === beforeLoading ? trip.contactName : null;
    return (
      <li className="flex items-center gap-3.5 border-t border-line-soft py-3.5 first:border-t-0 first:pt-0 last:pb-0">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-icon", load ? "bg-green-50 text-green-700" : "bg-warning-100 text-warning")}>
          <MapPin aria-hidden className="size-5.5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block text-meta text-ink-3">{[load ? t.loadAt : t.deliverTo, who].filter(Boolean).join(" · ")}</span>
          <span className="block truncate text-[17px] font-semibold text-ink">{load ? trip.from : trip.to}</span>
        </span>
      </li>
    );
  };
  return (
    <ul className="rounded-card border border-line bg-surface p-4.5">
      {stop("load")}
      {stop("drop")}
    </ul>
  );
}

export async function DriverTrip({ viewer }: { viewer: Promise<Viewer> }) {
  await viewer;
  const { trip, org } = await currentTrip();
  if (!trip) return <NoTrip org={org} />;
  const when = trip.status === "assigned" ? loadsIn(trip.pickupFrom) : null;
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <NightScreen />
      <div className="flex items-center justify-between gap-3">
        <p className="text-meta font-semibold tracking-[0.06em] text-ink-3 uppercase">{(trip.status === "assigned" ? t.next : t.now).replace("{ref}", trip.ref)}</p>
        <StatusChip tone="info">{when ?? t.status[trip.status as keyof typeof t.status] ?? trip.status}</StatusChip>
      </div>
      <h1 className="text-[32px] leading-tight font-semibold text-ink">
        {trip.from} → {trip.to}
      </h1>
      <Stops trip={trip} />
      {trip.status === "assigned" ? <Checklist tripId={trip.id} /> : null}
      <TripActions trip={trip} />
      <p className="text-center text-meta text-ink-3">{t.phaseNote}</p>
    </div>
  );
}

/** DVD01: on a computer the trip is view only, with a QR code to open it on the phone. */
export async function DriverTripDesk({ viewer }: { viewer: Promise<Viewer> }) {
  await viewer;
  const { trip } = await currentTrip();
  const url = `${await requestOrigin()}/app/drive`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, color: { dark: "#0A3D2A", light: "#FFFFFF" } });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        {trip ? (
          <>
            <h1 className="text-title-1 text-ink">
              {trip.from} → {trip.to}
            </h1>
            <Stops trip={trip} />
            <dl className="grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-2">
              <div>
                <dt className="text-meta text-ink-3">{t.goods}</dt>
                <dd className="text-body font-semibold text-ink">{[trip.goods, trip.weightKg ? `${Math.round(trip.weightKg / 1000)} t` : null, trip.quantity?.toLocaleString("en-NG")].filter(Boolean).join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-meta text-ink-3">{t.truck}</dt>
                <dd className="text-body font-semibold text-ink">{trip.plate}</dd>
              </div>
            </dl>
          </>
        ) : (
          <NoTrip org={null} />
        )}
      </div>
      <aside className="flex flex-col items-center gap-3 rounded-card bg-green-900 p-6 text-center text-white">
        <p className="text-title-3">{t.desk.title}</p>
        <p className="text-body text-green-200">{t.desk.text}</p>
        <div className="mt-2 rounded-callout bg-white p-4" role="img" aria-label={t.desk.scan}>
          {/* The QR code is made on our server from our own link. */}
          <div className="size-44 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <p className="text-meta text-green-200">{t.desk.scan}</p>
      </aside>
    </div>
  );
}
