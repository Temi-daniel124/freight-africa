"use client";

import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

// Pill segmented control (DESIGN_SYSTEM.md 10.3). The green pill slides with a CSS transform, so this
// needs no animation library; options share the width equally.
export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: SegmentedControlProps<T>) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div role="radiogroup" aria-label={label} className={cn("relative flex rounded-pill bg-green-50 p-1", className)}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-pill bg-green-700 transition-transform motion-standard"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
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
