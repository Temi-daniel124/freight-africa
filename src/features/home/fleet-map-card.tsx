"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import messages from "@/messages/en.json";
import type { MapTruck } from "@/features/tracking/trip-map";

const TripMap = dynamic(() => import("@/features/tracking/trip-map").then((m) => m.TripMap), { ssr: false });

/** A map card (about 200 px) with every truck on a trip; tapping it opens the trips list. */
export function FleetMapCard({ trucks }: { trucks: MapTruck[] }) {
  const stable = useMemo(() => trucks, [trucks]);
  return (
    <Link href="/app/haul/trips" aria-label={messages.home2.openMap} className="relative block h-50 overflow-hidden rounded-tile bg-green-50 shadow-raised lg:h-64 lg:rounded-card">
      <TripMap trucks={stable} interactive={false} className="absolute inset-0" />
    </Link>
  );
}
