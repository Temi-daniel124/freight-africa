"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { saveNightLook } from "./actions";

// DV32 / DV17 Dark screen at night: Auto (after sunset, 7 pm to 6 am in Lagos), Always or Never. Kept on
// the phone; the driver shell reads it and sets data-night on the page.

type Mode = "auto" | "always" | "never";
const KEY = "fa-night";
const listeners = new Set<() => void>();
const read = (): Mode => {
  const v = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
  return v === "always" || v === "never" ? v : "auto";
};
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export function isNight(mode: Mode, now = new Date()) {
  if (mode !== "auto") return mode === "always";
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(now));
  return h >= 19 || h < 6;
}

/** Applies the night look while mounted (driver shell). */
export function NightScreen() {
  const mode = useSyncExternalStore(subscribe, read, () => "auto" as Mode);
  useEffect(() => {
    // Phones only: on a computer the trip is view only (DVD01), and the night look is for the cab.
    const apply = () => document.documentElement.toggleAttribute("data-night", isNight(mode) && window.matchMedia("(max-width: 1023px)").matches);
    apply();
    const timer = window.setInterval(apply, 60_000);
    return () => (window.clearInterval(timer), document.documentElement.removeAttribute("data-night"));
  }, [mode]);
  return null;
}

export function NightChoice() {
  const mode = useSyncExternalStore(subscribe, read, () => "auto" as Mode);
  const set = (m: Mode) => {
    localStorage.setItem(KEY, m);
    listeners.forEach((fn) => fn());
    void saveNightLook(m);
  };
  return (
    <div role="radiogroup" aria-label={messages.driverMe.night} className="grid grid-cols-3 gap-1 rounded-pill bg-[#E9EBE5] p-1">
      {(["auto", "always", "never"] as const).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => set(m)} className={cn("h-11 rounded-pill text-body font-semibold", mode === m ? "bg-surface text-ink shadow-raised" : "text-ink-2")}>
          {messages.driverMe.nightOptions[m]}
        </button>
      ))}
    </div>
  );
}
