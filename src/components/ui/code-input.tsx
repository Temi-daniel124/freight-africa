"use client";

import { cn } from "@/lib/utils";

type CodeInputProps = {
  id: string;
  name: string;
  /** How many digits the code has. */
  length: number;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** "error" shakes the boxes once; "success" turns them green one after another. */
  state?: "idle" | "error" | "success";
  /** Change this to replay the shake for a second wrong code. */
  attempt?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
};

// DESIGN_SYSTEM.md section 9: one box per digit, auto-advance, paste and SMS autofill.
// One real input sits invisibly over the boxes, so typing, pasting, autofill and screen readers all work
// the way they do for an ordinary field; the boxes only draw what was typed.
export function CodeInput({ id, name, length, label, value, onChange, state = "idle", attempt = 0, disabled, autoFocus, describedBy }: CodeInputProps) {
  const digits = value.slice(0, length).split("");
  const active = Math.min(digits.length, length - 1);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      {/* Focus is read with :focus-within, not from focus events, so a field focused before the page is
          interactive (autofocus) still shows its ring and caret. */}
      <div key={attempt} className={cn("group relative", state === "error" && "animate-shake motion-reduce:animate-none")}>
        <div aria-hidden className="flex gap-1.5 lg:gap-2">
          {Array.from({ length }, (_, index) => {
            const typing = !disabled && state !== "success" && index === active;
            return (
              <span
                key={index}
                style={state === "success" ? { transitionDelay: `${index * 60}ms` } : undefined}
                className={cn(
                  "tabular type-code-digit flex h-14 min-w-0 flex-1 items-center justify-center rounded-input border border-line-strong bg-surface text-ink transition-colors motion-standard lg:h-16",
                  // Gate 1 target: a filled box is green-tinted; the box being typed in has the focus ring.
                  digits[index] !== undefined && state === "idle" && "border-green-200 bg-green-50",
                  typing && "group-focus-within:border-green-700 group-focus-within:ring-4 group-focus-within:ring-green-500/16",
                  state === "error" && "border-danger",
                  state === "success" && "border-success bg-success-100 text-success",
                  disabled && state !== "success" && "border-line bg-green-50 text-ink-3",
                )}
              >
                {digits[index] ?? (typing ? <span className="hidden h-7 w-0.5 animate-caret rounded-pill bg-green-700 group-focus-within:block motion-reduce:animate-none" /> : null)}
              </span>
            );
          })}
        </div>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          disabled={disabled}
          // The code screen has one job, so the field takes focus when it opens.
          autoFocus={autoFocus}
          aria-invalid={state === "error" ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
          onPaste={(event) => {
            // A pasted "482 916" or "482-916" would be cut short by maxLength, so take its digits here.
            event.preventDefault();
            onChange(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length));
          }}
          className="absolute inset-0 size-full cursor-text rounded-input text-body-lg opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}
