import { cn } from "@/lib/utils";

/** Mockup .steps: one 5 px bar per step, green up to the current one. */
export function Steps({ total, done, label }: { total: number; done: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={cn("h-1.25 flex-1 rounded-pill", i < done ? "bg-green-700" : "bg-line-field")} />
      ))}
    </div>
  );
}

/** Mockup .trk: a 6 px track with a green fill (0–100). */
export function Track({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden rounded-pill bg-track">
      <i className="block h-full rounded-pill bg-green-700 transition-[width] motion-standard" style={{ width: `${pct}%` }} />
    </div>
  );
}
