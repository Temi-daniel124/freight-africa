"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

const t = messages.home2.chips;
type Key = "all" | "onTrip" | "ready" | "paused";

/** "12 trucks · 5 on a trip · 4 ready · 3 paused": chips that filter the truck cards below. */
export function FleetChips({ counts }: { counts: Record<Key, number> }) {
  const [active, setActive] = useState<Key>("all");
  useEffect(() => {
    const grid = document.querySelector("[data-fleet-grid]");
    grid?.querySelectorAll<HTMLElement>("[data-state]").forEach((card) => {
      const state = card.dataset.state;
      const show = active === "all" || state === active || (active === "paused" && state === "review");
      card.hidden = !show;
    });
  }, [active]);
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" role="group" aria-label={t.label}>
      {(["all", "onTrip", "ready", "paused"] as Key[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={active === key}
          onClick={() => setActive(key)}
          className={cn("inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-body-sm font-semibold whitespace-nowrap", active === key ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink-2")}
        >
          {t[key].replace("{n}", String(counts[key]))}
        </button>
      ))}
    </div>
  );
}
