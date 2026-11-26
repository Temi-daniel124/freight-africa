"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  id: string;
  /** Submitted as "on" / "off" under this name when set. */
  name?: string;
  label: string;
  help?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
};

/** A labelled on/off switch (role="switch"); the whole row is the 44 px+ hit area. */
export function Switch({ id, name, label, help, defaultChecked = false, checked, disabled, onChange, className }: SwitchProps) {
  const [own, setOwn] = useState(defaultChecked);
  const on = checked ?? own;
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-4", className)}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="text-body font-semibold text-ink">
          {label}
        </label>
        {help ? (
          <span id={helpId} className="text-meta text-ink-3">
            {help}
          </span>
        ) : null}
      </span>
      {name ? <input type="hidden" name={name} value={on ? "on" : "off"} /> : null}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={helpId}
        disabled={disabled}
        onClick={() => {
          const next = !on;
          if (checked === undefined) setOwn(next);
          onChange?.(next);
        }}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-pill transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] disabled:cursor-not-allowed disabled:opacity-50",
          on ? "bg-green-700" : "bg-control-off",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5.5 rounded-full bg-surface shadow-knob transition-transform duration-150 motion-reduce:transition-none",
            on ? "translate-x-[23px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}
