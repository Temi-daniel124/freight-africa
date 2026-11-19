"use client";

import { Toaster as Sonner } from "sonner";
import { toastActionClasses, toastClasses } from "./feedback";

// Live toasts, styled as the Gate 4 component sheet's toast (see Toast in feedback.tsx).
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      duration={4000}
      offset={112}
      toastOptions={{ unstyled: true, classNames: { toast: toastClasses, actionButton: toastActionClasses } }}
    />
  );
}
