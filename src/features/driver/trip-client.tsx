"use client";

import { Check, List, Navigation, Phone } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import type { DriverTripView } from "./trip";

const t = messages.driverTrip;

// DV12 "Before you go": ticked on this phone only, per trip.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export function Checklist({ tripId }: { tripId: string }) {
  const key = `fa-before-${tripId}`;
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(key) ?? "", () => "");
  const ticked = new Set(raw.split(",").filter(Boolean));
  const toggle = (i: number) => {
    const next = new Set(ticked);
    if (next.has(String(i))) next.delete(String(i));
    else next.add(String(i));
    localStorage.setItem(key, [...next].join(","));
    listeners.forEach((fn) => fn());
  };
  return (
    <section className="rounded-card border border-line bg-surface p-4.5">
      <h2 className="text-[17px] font-semibold text-ink">{t.before}</h2>
      <ul className="mt-2">
        {t.checklist.map((item, i) => {
          const on = ticked.has(String(i));
          return (
            <li key={item}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(i)} className="flex min-h-11 w-full items-center gap-3 text-left text-[17px] text-ink">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-[8px] border", on ? "border-green-900 bg-green-900 text-white" : "border-line-field bg-surface")}>
                  {on ? <Check aria-hidden className="size-4.5" strokeWidth={2.4} /> : null}
                </span>
                {item}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const tile = "flex h-21 flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface text-body font-semibold text-ink";

export function TripActions({ trip }: { trip: DriverTripView }) {
  const toPickup = ["assigned", "to_pickup", "at_pickup", "loading"].includes(trip.status);
  const lat = toPickup ? trip.pickupLat : trip.dropLat;
  const lng = toPickup ? trip.pickupLng : trip.dropLng;
  const first = trip.contactName?.split(" ")[0];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {lat != null && lng != null ? (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className={tile}>
          <Navigation aria-hidden className="size-6.5 text-green-800" strokeWidth={1.8} />
          {t.directions}
        </a>
      ) : null}
      <Sheet
        title={t.detailsTitle}
        trigger={
          <button type="button" className={tile}>
            <List aria-hidden className="size-6.5 text-green-800" strokeWidth={1.8} />
            {t.details}
          </button>
        }
      >
        <dl className="flex flex-col gap-4 pb-2">
          <div>
            <dt className="text-meta text-ink-3">{t.goods}</dt>
            <dd className="text-[17px] font-semibold text-ink">{[trip.goods, trip.weightKg ? `${Math.round(trip.weightKg / 1000)} t` : null, trip.quantity ? `${trip.quantity.toLocaleString("en-NG")} ${trip.unit ?? ""}`.trim() : null].filter(Boolean).join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-3">{t.truck}</dt>
            <dd className="text-[17px] font-semibold text-ink">{trip.plate}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-3">{t.reference}</dt>
            <dd className="text-[17px] font-semibold text-ink">{trip.ref}</dd>
          </div>
        </dl>
      </Sheet>
      {trip.contactPhone ? (
        <a href={`tel:${trip.contactPhone}`} className={tile}>
          <Phone aria-hidden className="size-6.5 text-green-800" strokeWidth={1.8} />
          {t.call.replace("{name}", first ?? "")}
        </a>
      ) : null}
    </div>
  );
}
