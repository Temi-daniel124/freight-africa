"use client";

import { useEffect, useState } from "react";

// Driver rules: typing is off while the truck moves (voice notes still work). Moving means the phone
// reports more than 3 m/s (about 11 km/h); it reads speed only while the screen using it is open.
export const MOVING_MS = 3;

export function isMoving(speed: number | null | undefined) {
  return typeof speed === "number" && Number.isFinite(speed) && speed > MOVING_MS;
}

export function useMoving(enabled = true) {
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setMoving(isMoving(p.coords.speed)),
      () => setMoving(false),
      { enableHighAccuracy: false, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);
  return moving;
}
