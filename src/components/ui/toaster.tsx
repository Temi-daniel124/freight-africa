"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      duration={4000}
      toastOptions={{ unstyled: true, classNames: { toast: "flex items-center gap-3 rounded-pill bg-ink px-6 py-4 text-body text-white shadow-floating" } }}
    />
  );
}
