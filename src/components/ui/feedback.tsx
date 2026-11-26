import { WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Gate 4 component sheet, "Feedback": the offline strip, the information banner and the toast.

/** Shown at the top of the content while the phone has no connection (ux-conventions §6). */
export function OfflineStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="status" className={cn("flex w-full items-center gap-2.5 rounded-nav bg-warning-100 px-4 py-3 text-body-sm text-warning", className)}>
      <WifiOff aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
      {children}
    </p>
  );
}

type BannerProps = { icon: LucideIcon; title: string; children?: ReactNode; className?: string };

/** A calm heads-up about something happening now (a truck nearly at pickup). */
export function Banner({ icon: Icon, title, children, className }: BannerProps) {
  return (
    <div className={cn("flex w-full items-start gap-3.5 rounded-callout bg-info-100 p-4", className)}>
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-digit bg-surface text-info">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <b className="block text-body font-semibold text-ink">{title}</b>
        {children ? <p className="mt-0.5 text-body-sm font-normal text-ink-2">{children}</p> : null}
      </div>
    </div>
  );
}

type ToastProps = { children: ReactNode; action?: ReactNode; className?: string };

/** The toast's look. Live toasts come from the Toaster (sonner) with the same classes. */
export function Toast({ children, action, className }: ToastProps) {
  return (
    <div role="status" className={cn(toastClasses, className)}>
      {children}
      {action}
    </div>
  );
}

export const toastClasses = "flex items-center gap-3 rounded-callout bg-ink px-4 py-3.5 text-body-sm font-medium text-white shadow-toast";
export const toastActionClasses = "rounded-pill px-2.5 py-1.5 text-body-sm font-semibold text-green-300 hover:bg-white/10";
