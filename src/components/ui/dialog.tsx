"use client";

import { AnimatePresence, m } from "motion/react";
import { Dialog as Radix } from "radix-ui";
import type { ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** The buttons, side by side from 600 px (the main one last), stacked on phones (main one first). */
  actions?: ReactNode;
};

/**
 * Mockup .dlg: a 460 px centred card, 28 px corners, 32 px padding, deep soft shadow, on the scrim.
 * Scales up from 0.96 with a fade, and back on close (README "desktop dialogs"). Radix handles focus
 * trapping, Esc and returning focus to the button that opened it.
 */
export function Dialog({ open, onOpenChange, title, description, children, actions }: DialogProps) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Radix.Portal forceMount>
            <Radix.Overlay asChild forceMount>
              <m.div className="fixed inset-0 z-40 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
            </Radix.Overlay>
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <Radix.Content asChild forceMount>
                <m.div
                  className="w-full max-w-115 rounded-dialog bg-surface p-6 shadow-dialog outline-none sm:p-8"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <Radix.Title className="text-title-2 text-ink">{title}</Radix.Title>
                  {description ? <Radix.Description className="mt-2 text-body text-ink-2">{description}</Radix.Description> : <Radix.Description className="sr-only">{title}</Radix.Description>}
                  {children ? <div className="mt-5">{children}</div> : null}
                  {actions ? <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse sm:[&>*]:flex-1">{actions}</div> : null}
                </m.div>
              </Radix.Content>
            </div>
          </Radix.Portal>
        ) : null}
      </AnimatePresence>
    </Radix.Root>
  );
}

/** Closes the dialog it sits in. */
export const DialogClose = Radix.Close;
