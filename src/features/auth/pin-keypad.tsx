"use client";

import { Delete, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

const t = messages.auth.pin;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export type KeypadAnswer = { error?: string; clear?: boolean; shake?: boolean } | void;

type PinKeypadProps = {
  title: string;
  lead?: string;
  /** Shown above the title when we know who it is (D045). */
  avatar?: ReactNode;
  /** Called with six digits; resolve with an error to show, or nothing when the screen moves on. */
  onComplete: (pin: string) => Promise<KeypadAnswer>;
  /** The bottom-left key slot: "Forgot PIN?" (or nothing). */
  forgot?: { label: string; onPress: () => void };
  /** Replaces the keypad (locked, or a step that needs a button instead). */
  blocked?: ReactNode;
  /** Shown under the dots, e.g. the bot check or "Use a different account". */
  extra?: ReactNode;
  /** Changing it clears the dots (a new step on the same screen). */
  stepKey?: string;
};

/**
 * D044 PIN screens (A-11, A-13), DESIGN_SYSTEM §14.3. Phones: the keypad is docked to the bottom in a
 * sheet with 28 px top corners; 28 px digits in borderless round keys at least 72 px tall; "Forgot PIN?"
 * in the bottom-left slot and Delete in the bottom-right; title and six dots centred above. From 768 px:
 * the same card centred, a compact keypad, and the physical keyboard. A wrong PIN shakes the dots and
 * buzzes on Android.
 */
export function PinKeypad({ title, lead, avatar, onComplete, forgot, blocked, extra, stepKey }: PinKeypadProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shakes, setShakes] = useState(0);

  // A new step on the same screen starts with empty dots.
  const [seenStep, setSeenStep] = useState(stepKey);
  if (seenStep !== stepKey) {
    setSeenStep(stepKey);
    setPin("");
  }

  const submit = useCallback(
    async (value: string) => {
      setBusy(true);
      try {
        const answer = await onComplete(value);
        if (answer?.error) setError(answer.error);
        if (answer?.shake) {
          setShakes((n) => n + 1);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(120);
        }
        if (answer?.clear !== false) setPin("");
      } catch {
        setError(t.failed);
        setPin("");
      } finally {
        setBusy(false);
      }
    },
    [onComplete],
  );

  const press = useCallback(
    (key: string) => {
      if (busy || blocked) return;
      if (key === "del") {
        setPin(pin.slice(0, -1));
        return;
      }
      if (pin.length >= 6) return;
      setError(null);
      const value = pin + key;
      setPin(value);
      if (value.length === 6) void submit(value);
    },
    [busy, blocked, pin, submit],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") press("del");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const keyClass =
    "grid h-18 min-w-18 place-items-center rounded-full text-[28px] leading-none font-semibold text-ink tabular transition-transform duration-150 motion-reduce:transition-none active:scale-[0.98] active:bg-green-50 disabled:opacity-60 md:h-14 md:min-w-14 md:text-[24px]";

  return (
    <div className="flex min-h-dvh flex-col bg-paper md:min-h-0 md:items-center md:justify-center md:bg-transparent md:py-8">
      <div className="flex w-full flex-col md:max-w-100 md:rounded-card md:border md:border-line md:bg-surface md:px-8 md:pt-8 md:pb-6 md:shadow-card">
        {/* Title, lead and the six dots, centred in the space above the keypad. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pt-12 pb-8 text-center md:flex-none md:px-0 md:pt-0 md:pb-6">
          {avatar}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-title-1 text-ink">{title}</h1>
            {lead ? <p className="text-body text-ink-2 [overflow-wrap:anywhere]">{lead}</p> : null}
          </div>
          <div
            key={shakes}
            role="status"
            aria-label={t.entered.replace("{n}", String(pin.length))}
            className={cn("flex gap-4", shakes > 0 && "animate-shake motion-reduce:animate-none")}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={cn("size-3.5 rounded-full border-2 transition-colors duration-150", i < pin.length ? "border-green-800 bg-green-800" : "border-line-strong bg-transparent")}
              />
            ))}
          </div>
          <div aria-live="polite" className="min-h-6">
            {error ? (
              <p className="flex items-center justify-center gap-1.5 text-label font-medium text-danger">
                <TriangleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                {error}
              </p>
            ) : null}
          </div>
          {extra}
        </div>

        {/* The keypad: a sheet docked to the bottom on phones, part of the card from 768 px. */}
        <div className="rounded-t-sheet bg-surface px-6 pt-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-[0_-8px_32px_rgb(8_56_38/0.08)] md:rounded-none md:p-0 md:shadow-none">
          {blocked ? (
            <div className="mx-auto flex w-full max-w-80 flex-col gap-3 py-4">{blocked}</div>
          ) : (
            <div className="mx-auto grid w-full max-w-80 grid-cols-3 gap-x-6 gap-y-2 md:max-w-64 md:gap-x-4">
              {DIGITS.map((key) => (
                <button key={key} type="button" onClick={() => press(key)} disabled={busy} aria-label={key} className={keyClass}>
                  {key}
                </button>
              ))}
              {forgot ? (
                <button type="button" onClick={forgot.onPress} disabled={busy} className="grid h-18 place-items-center rounded-full px-1 text-label font-semibold text-green-700 active:bg-green-50 md:h-14">
                  {forgot.label}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => press("0")} disabled={busy} aria-label="0" className={keyClass}>
                0
              </button>
              <button type="button" onClick={() => press("del")} disabled={busy || pin.length === 0} aria-label={t.delete} className={cn(keyClass, "text-ink-2")}>
                <Delete aria-hidden className="size-7 md:size-6" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
