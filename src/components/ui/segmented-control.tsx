"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  /** Below 600 px, stack the options vertically (for labels too long to share a phone's width). */
  stackOnPhone?: boolean;
  /**
   * "brand": the green sliding pill of the website and sign-up. "app": the Gate 4 component sheet's quiet
   * version for in-app filters (Active / Finding truck / Unpaid / Done): white selected pill on green-50,
   * each option as wide as its words.
   */
  appearance?: "brand" | "app";
};

// Pill segmented control (DESIGN_SYSTEM.md 10.3). The green pill slides with a CSS transform, so this
// needs no animation library; options share the width (or, stacked, the height) equally.
export function SegmentedControl<T extends string>({ options, value, onChange, label, className, stackOnPhone = false, appearance = "brand" }: SegmentedControlProps<T>) {
  if (appearance === "app") {
    return (
      <div role="radiogroup" aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-pill bg-green-50 p-1", className)}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "h-10 shrink-0 rounded-pill px-4 text-body-sm whitespace-nowrap transition motion-quick",
                active ? "bg-surface text-ink shadow-raised" : "text-ink-2 hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const position = { "--count": options.length, "--index": index } as CSSProperties;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={position}
      className={cn("relative flex rounded-pill bg-green-50 p-1", stackOnPhone && "max-sm:flex-col max-sm:rounded-card", className)}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/var(--count))] translate-x-[calc(var(--index)*100%)] rounded-pill bg-green-700 transition-transform motion-standard",
          stackOnPhone &&
            "max-sm:inset-x-1 max-sm:top-1 max-sm:bottom-auto max-sm:h-[calc((100%-0.5rem)/var(--count))] max-sm:w-auto max-sm:translate-x-0 max-sm:translate-y-[calc(var(--index)*100%)]",
        )}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative h-12 min-w-0 flex-1 rounded-pill px-3 text-label whitespace-nowrap transition-colors motion-quick sm:px-4",
              stackOnPhone && "max-sm:flex-none",
              active ? "text-white" : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
