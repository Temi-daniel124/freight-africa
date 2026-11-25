import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

type StaffCardProps = { eyebrow: string; title: string; text?: ReactNode; children?: ReactNode };

/**
 * The frame for every step into the staff console (ux-admin X-00; founder mockup "Admin Console Access"):
 * a centred card on paper on desktop, full screen on a phone. One title, one short line, one main action.
 */
export function StaffCard({ eyebrow, title, text, children }: StaffCardProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-paper lg:items-center lg:justify-center lg:px-4 lg:py-12">
      <div className="flex w-full flex-1 flex-col gap-6 bg-surface px-5 pt-8 pb-10 lg:max-w-120 lg:flex-none lg:rounded-card lg:border lg:border-line lg:p-10 lg:shadow-raised">
        <div className="flex flex-col gap-3">
          <Logo variant="primary-green" className="h-8 self-start" priority />
          <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{eyebrow}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1 text-ink">{title}</h1>
          {text ? <p className="text-body text-ink-2">{text}</p> : null}
        </div>
        {children}
      </div>
    </main>
  );
}
