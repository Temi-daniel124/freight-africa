"use client";

import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Keypad, PinDots } from "@/components/ui/keypad";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

const t = messages.auth.pin;

export type KeypadAnswer = { error?: string; clear?: boolean; shake?: boolean } | void;

type PinKeypadProps = {
  title: string;
  /** "Choose a PIN" is bigger (26 px, P05) than "Welcome back" (22 px, P05b). */
  large?: boolean;
  lead?: ReactNode;
  /** Shown above the title when we know who it is (D045). */
  avatar?: ReactNode;
  /** The phone header (Back and "Step 2 of 3", P05); without it the page starts with the avatar. */
  top?: ReactNode;
  /** Called with six digits; resolve with an error to show, or nothing when the screen moves on. */
  onComplete: (pin: string) => Promise<KeypadAnswer>;
  /** "Forgot PIN?", under the dots (P05b, D01b). */
  forgot?: { label: string; onPress: () => void };
  /** The bottom-left key ("Not you?", P05b), or empty. */
  corner?: { label: string; onPress: () => void };
  /** Replaces the keypad (a step that needs a button instead). */
  blocked?: ReactNode;
  /** Shown under the dots, e.g. the bot check. */
  extra?: ReactNode;
  /** Changing it clears the dots (a new step on the same screen). */
  stepKey?: string;
  /** D01b: the "Open Freight Africa" button in the desktop card. */
  openLabel?: string;
};

/**
 * D044 PIN screens (A-11, A-13), mockups P05, P05b and D01b. Phones: avatar, title, lead and six dots
 * centred; the keypad docked to the bottom in a white sheet with 28 px top corners. From 768 px: one
 * 420 px card on the paper with the logo top left, a compact keypad and the physical keyboard. A wrong PIN
 * shakes the dots and buzzes on Android.
 */
export function PinKeypad({ title, large, lead, avatar, top, onComplete, forgot, corner, blocked, extra, stepKey, openLabel }: PinKeypadProps) {
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
    <div className="relative flex min-h-dvh flex-col bg-paper md:items-center md:justify-center md:px-4 md:py-24">
      <Logo variant="primary-green" className="absolute top-9 left-10 hidden h-7.5 w-auto md:block" />
      <div className="flex min-h-dvh w-full flex-col md:min-h-0 md:max-w-105 md:rounded-card md:border md:border-line md:bg-surface md:px-8 md:pt-9 md:pb-6 md:text-center md:shadow-[0_40px_80px_-50px_rgba(15,26,20,0.5)]">
        <div className="md:hidden">{top}</div>
        {/* Avatar, title, lead and the six dots, centred in the space above the keypad. */}
        <div className={cn("flex flex-1 flex-col items-center px-8 pb-6 text-center md:flex-none md:px-0 md:pb-0", top ? "justify-center" : "pt-17.5")}>
          {avatar}
          <h1 className={cn("text-ink", avatar && "mt-4", large ? "text-step md:text-title-2" : "text-title-2")}>{title}</h1>
          {lead ? <p className={cn("mt-1.5 [overflow-wrap:anywhere]", large ? "mt-2 text-body text-ink-2 md:text-meta md:text-ink-3" : "text-meta text-ink-3")}>{lead}</p> : null}
          <div className="mt-7.5 md:mt-6.5">
            <PinDots filled={pin.length} label={t.entered.replace("{n}", String(pin.length))} shake={shakes} />
          </div>
          <div aria-live="polite" className={cn(error && "mt-3")}>
            {error ? (
              <p className="flex items-center justify-center gap-1.5 text-label font-medium text-danger">
                <TriangleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                {error}
              </p>
            ) : null}
          </div>
          <p className="mt-3.5 hidden text-caption text-ink-3 md:block">{t.keyboard}</p>
          {forgot && !blocked ? (
            <button type="button" onClick={forgot.onPress} className="mt-3.5 grid h-12 place-items-center px-2 text-body-sm font-semibold text-green-700 md:hidden">
              {forgot.label}
            </button>
          ) : null}
          {extra ? <div className="mt-3 flex flex-col items-center gap-3">{extra}</div> : null}
        </div>

        {/* The keypad: a sheet docked to the bottom on phones, part of the card from 768 px. */}
        <div className="rounded-t-sheet bg-surface px-6 pt-4 pb-[max(env(safe-area-inset-bottom),30px)] shadow-[0_-10px_40px_-24px_rgba(15,26,20,0.25)] md:mt-3.5 md:rounded-none md:p-0 md:shadow-none">
          {blocked ? (
            <div className="mx-auto flex w-full max-w-80 flex-col gap-3 py-4">{blocked}</div>
          ) : (
            <>
              <Keypad onKey={press} deleteLabel={t.delete} disabled={busy} canDelete={pin.length > 0} extra={corner} />
              {openLabel ? (
                <Button className="mt-4.5 hidden w-full md:flex" loading={busy} loadingLabel={openLabel} disabled={pin.length < 6} onClick={() => void submit(typed.current)}>
                  {openLabel}
                </Button>
              ) : null}
              {forgot ? (
                <button type="button" onClick={forgot.onPress} className="hidden h-12 w-full place-items-center text-body-sm font-semibold text-green-700 md:grid">
                  {forgot.label}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
