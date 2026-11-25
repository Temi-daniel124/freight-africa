"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

type SheetProps = {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  /** Pinned to the bottom of the panel (desktop) and the end of the sheet (phone). */
  actions?: ReactNode;
  /** "panel": forms and details. "confirm": a short yes/no, a small centred dialog from 768 px. */
  kind?: "panel" | "confirm";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DESKTOP = "(min-width: 768px)";

/** True from 768 px (D045: panels from the right there, bottom sheets below). */
export function useWideScreen() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

/**
 * D045, one component for every sheet: below 768 px a vaul bottom sheet (28 px top corners, grab
 * handle, drag down to close); from 768 px a right panel, full height and 440–480 px wide, with a header
 * (title and close), the actions pinned at the bottom, Esc to close, focus trapped and a scrim. Short
 * yes/no confirmations are a small centred dialog from 768 px.
 */
export function Sheet({ trigger, title, description, children, actions, kind = "panel", open, onOpenChange }: SheetProps) {
  const wide = useWideScreen();
  if (wide) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
          {kind === "confirm" ? (
            <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-floating outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none">
              <Dialog.Title className="text-lead font-semibold text-ink">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1.5 text-body-sm text-ink-2">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
              <div className="mt-4 flex flex-col gap-2">{children}</div>
              {actions ? <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div> : null}
            </Dialog.Content>
          ) : (
            <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[clamp(440px,36vw,480px)] max-w-full flex-col bg-surface shadow-floating outline-none duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right motion-reduce:animate-none">
              <header className="flex min-h-18 items-center gap-3 border-b border-line px-6">
                <Dialog.Title className="min-w-0 flex-1 truncate text-lead font-semibold text-ink">{title}</Dialog.Title>
                <Dialog.Close className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-paper" aria-label={messages.shell.close}>
                  <X aria-hidden className="size-5" strokeWidth={1.75} />
                </Dialog.Close>
              </header>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {description ? <Dialog.Description className="mb-4 text-body-sm text-ink-2">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
                <div className="flex flex-col gap-1">{children}</div>
              </div>
              {actions ? <footer className="flex flex-col gap-2 border-t border-line px-6 py-4">{actions}</footer> : null}
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-text flex-col rounded-t-sheet bg-surface shadow-floating outline-none">
          <div className="overflow-y-auto px-5 pt-3 pb-6">
            <div aria-hidden className="mx-auto mb-4 h-1.25 w-10 rounded-pill bg-line-strong" />
            <Drawer.Title className="text-lead font-semibold text-ink">{title}</Drawer.Title>
            {description ? <Drawer.Description className="mt-1.5 mb-4 text-body-sm font-normal text-ink-2">{description}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
            <div className="flex flex-col gap-1">{children}</div>
            {actions ? <div className="mt-5 flex flex-col gap-2">{actions}</div> : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** A close button for use inside a sheet's actions (either form). */
export function SheetClose({ children, wide }: { children: ReactNode; wide: boolean }) {
  return wide ? <Dialog.Close asChild>{children}</Dialog.Close> : <Drawer.Close asChild>{children}</Drawer.Close>;
}

/** The sheet's look without the drawer, for the component gallery. */
export function SheetPreview({ title, description, children }: Omit<SheetProps, "trigger">) {
  return (
    <div className="relative h-80 w-full overflow-hidden rounded-tile bg-scrim">
      <div className={cn("absolute inset-x-0 bottom-0 rounded-t-sheet bg-surface px-5 pt-3 pb-6")}>
        <div aria-hidden className="mx-auto mb-4 h-1.25 w-10 rounded-pill bg-line-strong" />
        <p className="text-lead font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1.5 mb-4 text-body-sm font-normal text-ink-2">{description}</p> : null}
        <div className="flex flex-col gap-1">{children}</div>
      </div>
    </div>
  );
}
