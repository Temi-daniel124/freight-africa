"use client";

import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Keypad, PinDots } from "@/components/ui/keypad";
import messages from "@/messages/en.json";

const t = messages.auth.pin;

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
  // The digits so far, read by key handlers: fast typing must never lose a key between renders.
  const typed = useRef("");
  useEffect(() => {
    typed.current = "";
  }, [stepKey]);

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
        if (answer?.clear !== false) {
          typed.current = "";
          setPin("");
        }
      } catch {
        setError(t.failed);
        typed.current = "";
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
        typed.current = typed.current.slice(0, -1);
        setPin(typed.current);
        return;
      }
      if (typed.current.length >= 6) return;
      setError(null);
      typed.current += key;
      setPin(typed.current);
      if (typed.current.length === 6) void submit(typed.current);
    },
    [busy, blocked, submit],
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

  return (
    <div className="flex min-h-dvh flex-col bg-paper md:min-h-0 md:items-center md:justify-center md:bg-transparent md:py-8">
      <div className="flex min-h-dvh w-full flex-col md:min-h-0 md:max-w-105 md:rounded-card md:border md:border-line md:bg-surface md:px-8 md:pt-8 md:pb-6">
        {/* Title, lead and the six dots, centred in the space above the keypad. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pt-12 pb-8 text-center md:flex-none md:px-0 md:pt-0 md:pb-6">
          {avatar}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-title-1 text-ink">{title}</h1>
            {lead ? <p className="text-body text-ink-2 [overflow-wrap:anywhere]">{lead}</p> : null}
          </div>
          <PinDots filled={pin.length} label={t.entered.replace("{n}", String(pin.length))} shake={shakes} />
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
        <div className="rounded-t-sheet bg-surface px-5 pt-5 pb-[max(env(safe-area-inset-bottom),24px)] shadow-sheet md:rounded-none md:p-0 md:shadow-none">
          {blocked ? (
            <div className="mx-auto flex w-full max-w-80 flex-col gap-3 py-4">{blocked}</div>
          ) : (
            <div className="mx-auto w-full max-w-80">
              <Keypad onKey={press} deleteLabel={t.delete} disabled={busy} canDelete={pin.length > 0} extra={forgot} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
