"use client";

import * as m from "motion/react-m";
import { useId } from "react";
import { springUi } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

export function SegmentedControl<T extends string>({ options, value, onChange, label, className }: SegmentedControlProps<T>) {
  const pillId = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-pill bg-green-50 p-1", className)}>
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
              "relative h-12 flex-1 rounded-pill px-4 text-label whitespace-nowrap transition-colors motion-quick",
              active ? "text-white" : "text-ink-2 hover:text-ink",
            )}
          >
            {active ? <m.span layoutId={pillId} transition={springUi} className="absolute inset-0 rounded-pill bg-green-700" /> : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
