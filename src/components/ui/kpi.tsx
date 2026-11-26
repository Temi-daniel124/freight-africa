import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type KpiTileProps = { label: string; value: ReactNode; note?: ReactNode; tone?: "plain" | "urgent"; className?: string };

/** Console KPI tile (admin mockups .kpi and .urg): a small label, a 24/600 figure, an optional line under it. */
export function KpiTile({ label, value, note, tone = "plain", className }: KpiTileProps) {
  return (
    <div className={cn("rounded-tile border px-4 py-3.5", tone === "urgent" ? "border-danger-200 bg-danger-50" : "border-line bg-surface", className)}>
      <p className="text-caption font-semibold text-ink-3">{label}</p>
      <p className="tabular mt-1 text-stat text-ink">{value}</p>
      {note ? <p className="mt-0.5 text-caption text-ink-3">{note}</p> : null}
    </div>
  );
}
