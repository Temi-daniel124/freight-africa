"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

type SheetProps = { trigger: ReactNode; title: string; children: ReactNode };

export function Sheet({ trigger, title, children }: SheetProps) {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-text rounded-t-sheet bg-surface shadow-floating outline-none">
          <div aria-hidden className="mx-auto mt-3 h-1 w-10 rounded-pill bg-line-strong" />
          <div className="flex flex-col gap-4 p-6">
            <Drawer.Title className="text-title-2 text-ink">{title}</Drawer.Title>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
