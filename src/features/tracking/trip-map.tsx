"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

// D045 trip map: MapLibre with OpenFreeMap tiles (free, no key; TOOLING-POLICY). The route is a green
// line, the truck a deep green marker, the destination a pin. Live positions arrive with Phase 4; until
// then the trip's last known position. Several trucks show for an owner's map card.

export type MapPoint = { lat: number; lng: number };
export type MapTruck = MapPoint & { label: string };

type Props = {
  route?: MapPoint[];
  trucks?: MapTruck[];
  destination?: MapPoint | null;
  interactive?: boolean;
  className?: string;
  /** Room for a panel over the map (px), so the fitted view is not hidden under it. */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
};

const STYLE = "https://tiles.openfreemap.org/styles/positron";

function truckEl(label: string) {
  const el = document.createElement("div");
  el.setAttribute("aria-label", label);
  el.style.cssText =
    "width:36px;height:36px;border-radius:999px;background:#083826;border:3px solid #fff;box-shadow:0 4px 12px rgb(8 56 38/.35);display:grid;place-items:center";
  el.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';
  return el;
}

function pinEl() {
  const el = document.createElement("div");
  el.style.cssText = "width:30px;height:40px";
  el.innerHTML =
    '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39C12 33 2 24 2 15a13 13 0 1 1 26 0c0 9-10 18-13 24Z" fill="#13703F" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>';
  return el;
}

export function TripMap({
  route = [],
  trucks = [],
  destination = null,
  interactive = true,
  className,
  padding,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    let map: import("maplibre-gl").Map | null = null;
    let gone = false;
    void import("maplibre-gl").then((maplibre) => {
      if (gone || !box.current) return;
      const points = [
        ...route,
        ...trucks,
        ...(destination ? [destination] : []),
      ];
      const center = points[0] ?? { lat: 9.08, lng: 7.4 };
      const m = new maplibre.Map({
        container: box.current,
        style: STYLE,
        center: [center.lng, center.lat],
        zoom: 5,
        interactive,
        attributionControl: { compact: true },
      });
      map = m;
      m.on("load", () => {
        const map = m;
        if (route.length > 1) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.map((p) => [p.lng, p.lat]),
              },
            },
          });
          map.addLayer({
            id: "route-casing",
            type: "line",
            source: "route",
            paint: { "line-color": "#ffffff", "line-width": 8 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            paint: { "line-color": "#13703F", "line-width": 4.5 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }
        for (const t of trucks)
          new maplibre.Marker({ element: truckEl(t.label) })
            .setLngLat([t.lng, t.lat])
            .addTo(map);
        if (destination)
          new maplibre.Marker({ element: pinEl(), anchor: "bottom" })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map);
        if (points.length > 1) {
          const lngs = points.map((p) => p.lng);
          const lats = points.map((p) => p.lat);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            {
              padding: {
                top: 48 + (padding?.top ?? 0),
                bottom: 48 + (padding?.bottom ?? 0),
                left: 40 + (padding?.left ?? 0),
                right: 40 + (padding?.right ?? 0),
              },
              duration: 0,
              maxZoom: 9,
            },
          );
        }
      });
    });
    return () => {
      gone = true;
      map?.remove();
    };
  }, [route, trucks, destination, interactive, padding]);
  return <div ref={box} className={className} role="img" aria-label="Map" />;
}
