"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Mockup .dots: 14 px rings that fill green as digits are typed. Announced as "n of 6 entered". */
export function PinDots({ filled, length = 6, label, shake = 0 }: { filled: number; length?: number; label: string; shake?: number }) {
  return (
    <div key={shake} role="status" aria-label={label} className={cn("flex justify-center gap-3.5", shake > 0 && "animate-shake motion-reduce:animate-none")}>
      {Array.from({ length }, (_, i) => (
        <span key={i} className={cn("size-3.5 rounded-full border-2 transition-colors duration-150", i < filled ? "border-green-700 bg-green-700" : "border-line-strong")} />
      ))}
    </div>
  );
}

type KeypadProps = {
  onKey: (key: string) => void;
  deleteLabel: string;
  disabled?: boolean;
  canDelete?: boolean;
  /** The bottom-left slot ("Forgot PIN?"), or empty. */
  extra?: { label: string; onPress: () => void };
  /** P05: 68 px keys, 8 px between rows and 20 px between columns (phones). */
  roomy?: boolean;
};

/**
 * Mockup .kp: a 3 × 4 grid with 4 px gaps, 64 px keys with 18 px corners, 28 px digits at weight 500,
 * a soft press colour; 52 px keys with 22 px digits in the desktop card (D01b). The page listens for the physical keyboard itself (see PinKeypad).
 */
export function Keypad({ onKey, deleteLabel, disabled, canDelete = true, extra, roomy }: KeypadProps) {
  const key = cn(roomy ? "h-17" : "h-16", "grid place-items-center rounded-key text-[28px] md:h-13 md:text-[22px] leading-none font-medium text-ink tabular transition-colors duration-100 active:bg-green-50 hover:bg-paper disabled:opacity-60");
  return (
    <div className={cn("grid grid-cols-3", roomy ? "gap-x-5 gap-y-2 md:gap-1" : "gap-1")}>
      {DIGITS.map((digit) => (
        <button key={digit} type="button" onClick={() => onKey(digit)} disabled={disabled} aria-label={digit} className={key}>
          {digit}
        </button>
      ))}
      {extra ? (
        <button type="button" onClick={extra.onPress} disabled={disabled} className={cn(roomy ? "h-17" : "h-16", "grid place-items-center rounded-key px-1 text-label font-semibold text-green-700 active:bg-green-50 md:invisible md:h-13")}>
          {extra.label}
        </button>
      ) : (
        <span />
      )}
      <button type="button" onClick={() => onKey("0")} disabled={disabled} aria-label="0" className={key}>
        0
      </button>
      <button type="button" onClick={() => onKey("del")} disabled={disabled || !canDelete} aria-label={deleteLabel} className={cn(key, "text-ink-2")}>
        <Delete aria-hidden className="size-6.5 md:size-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
