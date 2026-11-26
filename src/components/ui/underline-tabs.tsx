"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Tab<T extends string> = { value: T; label: string; count?: number };

type UnderlineTabsProps<T extends string> = { tabs: readonly Tab<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string };

/**
 * Console underline tabs (admin mockups .tabx): 14/600 words, a 2 px green line under the chosen one,
 * a 1 px line under the row. Arrow keys move between tabs (WAI-ARIA tabs pattern).
 */
export function UnderlineTabs<T extends string>({ tabs, value, onChange, label, className }: UnderlineTabsProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.value);
    const sibling = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
    sibling?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            data-value={tab.value}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3.5 text-body-sm whitespace-nowrap transition-colors motion-quick",
              selected ? "border-green-700 text-green-700" : "border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="tabular rounded-pill bg-line-soft px-1.5 text-micro text-ink-nav">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
