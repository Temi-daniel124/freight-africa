import { cn } from "@/lib/utils";

// The signature road line (DESIGN_SYSTEM.md section 6.4): dash 12, gap 10, 3 px, rounded caps.
type RoadLineProps = { progress?: number; className?: string; label?: string; tone?: "default" | "inverse" };

export function RoadLine({ progress = 0, className, label, tone = "default" }: RoadLineProps) {
  const percent = Math.min(100, Math.max(0, progress));
  return (
    <svg role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={cn("block h-1 w-full overflow-visible", className)}>
      <line
        x1="0"
        y1="2"
        x2="100%"
        y2="2"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="12 10"
        className={tone === "inverse" ? "stroke-green-500" : "stroke-line-strong"}
      />
      {percent > 0 ? (
        <>
          <line x1="0" y1="2" x2={`${percent}%`} y2="2" strokeWidth="3" strokeLinecap="round" className="stroke-green-700" />
          <svg x={`${percent}%`} className="overflow-visible">
            <line x1="-12" y1="2" x2="0" y2="2" strokeWidth="3" strokeLinecap="round" className="stroke-road-yellow" />
          </svg>
        </>
      ) : null}
    </svg>
  );
}
