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
        "inline-flex h-12 items-center gap-2 rounded-pill border px-4 text-label transition motion-quick active:scale-press",
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

const statusTones = {
  info: "bg-info-100 text-info",
  warning: "bg-warning-100 text-warning",
  danger: "bg-danger-100 text-danger",
  success: "bg-success-100 text-success",
  neutral: "bg-green-50 text-ink-2",
} as const;

type StatusChipProps = { tone: keyof typeof statusTones; icon?: LucideIcon; children: ReactNode; className?: string };

export function StatusChip({ tone, icon: Icon, children, className }: StatusChipProps) {
  return (
    <span className={cn("inline-flex h-8 items-center gap-1 rounded-pill px-3 text-label whitespace-nowrap", statusTones[tone], className)}>
      {Icon ? <Icon aria-hidden className="size-4" strokeWidth={1.75} /> : null}
      {children}
    </span>
  );
}
