"use client";

import { Delete, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { setPin, signOutForNewPin, unlockWithPin } from "./actions";

const t = messages.drivers.pin;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/**
 * The PIN screen (founder mockup 1.4; D042): six dots and big keys (drivers' phones, gloves, sun).
 * "set" chooses and confirms a new PIN; "unlock" opens the app. The physical keyboard works too.
 */
export function PinPad({ mode, next }: { mode: "set" | "unlock"; next: string }) {
  const router = useRouter();
  const [pin, setPinValue] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);

  async function complete(value: string) {
    setBusy(true);
    try {
      if (mode === "set" && first === null) {
        setFirst(value);
        setPinValue("");
        return;
      }
      if (mode === "set" && first !== value) {
        setFirst(null);
        setPinValue("");
        setError(t.mismatch);
        return;
      }
      const result = mode === "set" ? await setPin(value) : await unlockWithPin(value, tries);
      if (result.status === "ok") {
        router.replace(next);
        return;
      }
      setPinValue("");
      if (result.status === "locked") setLocked(true);
      else if (result.status === "wrong") {
        setTries((n) => n + 1);
        setError(t.wrong.replace("{left}", String(result.left ?? 0)));
      } else if (result.status === "weak") {
        setFirst(null);
        setError(t.weak);
      } else if (result.status === "fresh") setError(t.fresh);
      else setError(t.failed);
    } finally {
      setBusy(false);
    }
  }

  function press(key: string) {
    if (busy || locked) return;
    setError(null);
    if (key === "del") {
      setPinValue((v) => v.slice(0, -1));
      return;
    }
    if (pin.length >= 6) return;
    const value = pin + key;
    setPinValue(value);
    if (value.length === 6) void complete(value);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (/^[0-9]$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") press("del");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const title = mode === "unlock" ? t.unlockTitle : first === null ? t.setTitle : t.confirmTitle;
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-title-1 text-ink">{title}</h1>
        <p className="text-body text-ink-2">{mode === "unlock" ? t.unlockLead : t.setLead}</p>
      </div>
      <div role="status" aria-label={`${pin.length} of 6`} className="flex gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cn("size-4 rounded-pill border-2", i < pin.length ? "border-ink bg-ink" : "border-line-strong")} />
        ))}
      </div>
      <div aria-live="polite" className="min-h-6">
        {error ? (
          <p className="flex items-center gap-1.5 text-label font-medium text-danger">
            <TriangleAlert aria-hidden className="size-4" strokeWidth={1.75} />
            {error}
          </p>
        ) : null}
      </div>
      {locked ? (
        <form action={signOutForNewPin} className="flex w-full flex-col gap-3">
          <p className="text-body text-ink">{t.locked}</p>
          <button type="submit" className="h-14 w-full rounded-button bg-green-700 text-body font-bold text-white">
            {t.forgot}
          </button>
        </form>
      ) : (
        <div className="grid w-full max-w-80 grid-cols-3 gap-3">
          {KEYS.map((key, i) =>
            key === "" ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                disabled={busy}
                aria-label={key === "del" ? t.delete : key}
                className={cn(
                  "grid h-18 place-items-center rounded-inner text-title-1 font-semibold text-ink tabular active:scale-press",
                  key === "del" ? "" : "border border-line bg-surface shadow-raised",
                )}
              >
                {key === "del" ? <Delete aria-hidden className="size-7" strokeWidth={1.75} /> : key}
              </button>
            ),
          )}
        </div>
      )}
      {mode === "unlock" && !locked ? (
        <form action={signOutForNewPin}>
          <button type="submit" className="text-body-sm font-semibold text-green-700">
            {t.forgot}
          </button>
        </form>
      ) : null}
      {mode === "set" ? (
        <Link href={next} className="sr-only">
          {t.done}
        </Link>
      ) : null}
    </div>
  );
}
