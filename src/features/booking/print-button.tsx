"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" size="md" onClick={() => window.print()}>
        <Printer aria-hidden strokeWidth={1.75} />
        {label}
      </Button>
      <p className="text-caption text-ink-3">{note}</p>
    </div>
  );
}
