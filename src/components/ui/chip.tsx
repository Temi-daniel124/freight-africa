import { Check, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean };

export function Chip({ selected, className, children, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-pill border px-4 py-2 text-left text-label transition motion-quick active:scale-press",
        selected ? "border-green-100 bg-green-100 text-green-700" : "border-line bg-surface text-ink hover:bg-green-50",
        className,
      )}
      {...props}
    >
      {selected ? <Check aria-hidden className="size-4" strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

// Gate 4 component sheet: one colour per trip state, always with words (never colour alone).
const statusTones = {
  warning: "bg-warning-100 text-warning",
  finding: "bg-road-yellow-100 text-road-yellow-800",
  success: "bg-success-100 text-success",
  info: "bg-info-100 text-info",
  danger: "bg-danger-100 text-danger",
  neutral: "border border-line bg-paper text-ink-2",
} as const;

export type StatusTone = keyof typeof statusTones;

type StatusChipProps = { tone: StatusTone; icon?: LucideIcon; children: ReactNode; className?: string };

export function StatusChip({ tone, icon: Icon, children, className }: StatusChipProps) {
  return (
    <span className={cn("inline-flex h-6.5 items-center gap-1.5 rounded-pill px-2.5 text-caption font-semibold tracking-normal whitespace-nowrap", statusTones[tone], className)}>
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}
