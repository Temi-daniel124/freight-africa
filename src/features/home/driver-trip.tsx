import { Phone } from "lucide-react";
import Link from "next/link";
import { EmptyScene } from "@/components/art/scenes";
import { TruckGraphic, truckKind } from "@/components/art/truck";
import { buttonVariants } from "@/components/ui/button";
import { trackData } from "@/features/tracking/data";
import { supabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { DriverMap } from "./driver-map";

const t = messages.driverTrip;
const LIVE = ["assigned", "to_pickup", "at_pickup", "loading", "loaded", "in_transit", "arrived"] as const;
const NEXT: Record<string, keyof typeof t.next> = { assigned: "goToPickup", to_pickup: "arrivedPickup", at_pickup: "startLoading", loading: "loaded", loaded: "startTrip", in_transit: "arrivedDropoff", arrived: "delivered" };

/**
 * The driver's Trip tab (founder mockup "one big button per step", D045). With a trip: the map card, the
 * next step as one big button, the goods (never money, D003), and Call for the pickup or receiver
 * contact during the live trip (D018). Phase 4 turns the steps into the code and photo flow.
 */
export async function DriverTrip() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  const { data: trips } = me ? await supabase.from("trips").select("id, status").eq("driver_id", me).in("status", LIVE).order("created_at", { ascending: false }).limit(1) : { data: [] };
  const trip = trips?.[0];
  const data = trip ? await trackData(trip.id) : null;
  if (!trip || !data) {
    return (
      <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-tile bg-surface px-6 py-10 text-center shadow-raised lg:rounded-card">
        <EmptyScene className="max-w-56" />
        <h2 className="text-title-2 text-ink">{t.emptyTitle}</h2>
        <p className="text-body text-ink-2">{t.emptyText}</p>
      </section>
    );
  }
  const { data: contact } = await (supabase.rpc as unknown as (fn: string, a: object) => Promise<{ data: { next_contact_name: string | null; next_contact_phone: string | null }[] | null }>)("trip_map", { p_trip: trip.id });
  const c = contact?.[0];
  const step = NEXT[trip.status];
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <DriverMap route={[data.from, data.to]} truck={data.truck} plate={data.plate} />
      <section className="flex flex-col gap-1 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card">
        <p className="tabular text-body-sm font-bold text-ink-3">{data.ref}</p>
        <p className="truncate text-title-2 font-extrabold whitespace-nowrap text-ink">
          {data.from.name} → {data.to.name}
        </p>
        <p className="text-body text-ink-2">{[data.goods, data.amount].filter(Boolean).join(" · ")}</p>
        <TruckGraphic kind={truckKind(data.truckTypeCode)} load={data.load} className="mt-3" />
      </section>
      {step ? (
        <Link href={`/app/drive/trip`} className={cn(buttonVariants({ size: "lg" }), "h-18 w-full text-body-lg")}>
          {t.next[step]}
        </Link>
      ) : null}
      {c?.next_contact_phone ? (
        <a href={`tel:${c.next_contact_phone}`} className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full gap-2")}>
          <Phone aria-hidden className="size-5" strokeWidth={2} />
          {t.call.replace("{name}", c.next_contact_name ?? "")}
        </a>
      ) : null}
    </div>
  );
}
