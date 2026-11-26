import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** dense: the console filter (.fltr), 34 px, near-black when chosen. */
type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; dense?: boolean };

export function Chip({ selected, dense = false, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-10 items-center gap-1.5 rounded-pill border px-4 text-left text-body-sm whitespace-nowrap transition motion-quick before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-[''] active:scale-press",
        // Mockup .chip / .chip.on: white with a line, deep green when chosen.
        selected ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink hover:bg-paper",
        dense && "h-8.5 px-3 text-[13px]",
        dense && (selected ? "border-ink bg-ink" : "text-ink-nav"),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Mockup status pills (.p-blue .p-amber .p-green .p-grey .p-red .p-mint): one colour per state, always
// with words (never colour alone). The older names stay as aliases for the screens built before D050.
const statusTones = {
  blue: "bg-info-100 text-info",
  amber: "bg-warning-100 text-warning",
  green: "bg-green-50 text-green-700",
  grey: "bg-line-soft text-ink-2",
  red: "bg-danger-100 text-danger",
  mint: "bg-green-300/16 text-green-300",
  info: "bg-info-100 text-info",
  warning: "bg-warning-100 text-warning",
  finding: "bg-warning-100 text-warning",
  success: "bg-green-50 text-green-700",
  danger: "bg-danger-100 text-danger",
  neutral: "bg-line-soft text-ink-2",
} as const;

export type StatusTone = keyof typeof statusTones;

type StatusChipProps = { tone: StatusTone; icon?: LucideIcon; children: ReactNode; className?: string };

export function StatusChip({ tone, icon: Icon, children, className }: StatusChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.25 text-caption leading-none font-semibold tracking-normal whitespace-nowrap", statusTones[tone], className)}>
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}
