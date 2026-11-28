"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import messages from "@/messages/en.json";

/** P14f in previews: the 5-second undo toast held open, so it can be compared with the mockup. */
export function UndoToastPreview() {
  useEffect(() => {
    const id = toast(messages.tripPage.cancelled, { duration: Infinity, action: { label: messages.tripPage.undo, onClick: () => undefined } });
    return () => void toast.dismiss(id);
  }, []);
  return null;
}
