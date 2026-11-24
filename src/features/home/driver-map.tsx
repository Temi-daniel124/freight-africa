"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { MapPoint } from "@/features/tracking/trip-map";

const TripMap = dynamic(() => import("@/features/tracking/trip-map").then((m) => m.TripMap), { ssr: false });

export function DriverMap({ route, truck, plate }: { route: MapPoint[]; truck: MapPoint | null; plate: string }) {
  const r = useMemo(() => route, [route]);
  const trucks = useMemo(() => (truck ? [{ ...truck, label: plate }] : []), [truck, plate]);
  return (
    <div className="relative h-56 overflow-hidden rounded-tile bg-green-50 shadow-raised lg:rounded-card">
      <TripMap route={r} trucks={trucks} destination={route[route.length - 1] ?? null} interactive={false} className="absolute inset-0" />
    </div>
  );
}
