"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

type SheetProps = { trigger: ReactNode; title: string; description?: string; children: ReactNode };

// Gate 4 component sheet, "Bottom sheet": 28 px top corners, a grab handle, title, one line, then the
// actions full width. Drag down, the scrim or Escape closes it (vaul).
export function Sheet({ trigger, title, description, children }: SheetProps) {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-text rounded-t-sheet bg-surface shadow-floating outline-none">
          <div className="px-5 pt-3 pb-6">
            <div aria-hidden className="mx-auto mb-4 h-1.25 w-10 rounded-pill bg-line-strong" />
            <Drawer.Title className="text-lead font-extrabold text-ink">{title}</Drawer.Title>
            {description ? <Drawer.Description className="mt-1.5 mb-4 text-body-sm font-normal text-ink-2">{description}</Drawer.Description> : null}
            <div className="flex flex-col gap-1">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** The sheet's look without the drawer, for the component gallery. */
export function SheetPreview({ title, description, children }: Omit<SheetProps, "trigger">) {
  return (
    <div className="relative h-80 w-full overflow-hidden rounded-tile bg-scrim">
      <div className="absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface px-5 pt-3 pb-6">
        <div aria-hidden className="mx-auto mb-4 h-1.25 w-10 rounded-pill bg-line-strong" />
        <p className="text-lead font-extrabold text-ink">{title}</p>
        {description ? <p className="mt-1.5 mb-4 text-body-sm font-normal text-ink-2">{description}</p> : null}
        <div className="flex flex-col gap-1">{children}</div>
      </div>
    </div>
  );
}
