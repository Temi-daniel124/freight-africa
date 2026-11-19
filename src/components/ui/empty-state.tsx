import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  /** Small line art above the title; the truck on a road by default. */
  art?: ReactNode;
  /** A green offer badge (Gate 4: "Your first trip has no service fee"). */
  offer?: string;
  /** The one main action. */
  action?: ReactNode;
  /** Short reassurance lines, each with its icon. */
  points?: { icon: LucideIcon; text: string }[];
  /** A quiet extra link under everything ("How it works"). */
  secondary?: ReactNode;
  children?: ReactNode;
  className?: string;
};

// Gate 4 component sheet, "Empty state": centred, calm, one main action. Every list and page that can be
// empty uses this, so a new person always sees what will appear and what to do first.
export function EmptyState({ title, art = <TruckArt />, offer, action, points, secondary, children, className }: EmptyStateProps) {
  return (
    <div className={cn("flex w-full flex-col items-center gap-2.5 px-6 py-10 text-center", className)}>
      {art}
      <h2 className="text-title-2 font-extrabold tracking-close text-ink">{title}</h2>
      {children ? <p className="max-w-90 text-body text-ink-2">{children}</p> : null}
      {offer ? (
        <span className="inline-flex h-8 items-center gap-2 rounded-pill bg-success-100 px-3 text-label font-bold tracking-normal text-success">
          <Check aria-hidden className="size-4" strokeWidth={1.75} />
          {offer}
        </span>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
      {points?.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center justify-center gap-2 text-body-sm font-normal text-ink-2">
              <Icon aria-hidden className="size-4 shrink-0 text-green-700" strokeWidth={1.75} />
              {text}
            </li>
          ))}
        </ul>
      ) : null}
      {secondary}
    </div>
  );
}

/** The small truck on a dashed road from the component sheet. Decorative. */
export function TruckArt() {
  return (
    <svg aria-hidden viewBox="0 0 120 80" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-20 w-30 stroke-green-700">
      <path d="M10 70h100" className="stroke-green-200" strokeDasharray="6 5" />
      <rect x="22" y="28" width="46" height="30" rx="4" />
      <path d="M68 38h16l10 10v10H68z" />
      <circle cx="36" cy="60" r="6" className="fill-surface" />
      <circle cx="84" cy="60" r="6" className="fill-surface" />
    </svg>
  );
}
