"use client";

import { Phone, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// DV22 SOS works only when pressed and held for 2 seconds, with a ring filling around it; DV22b turns
// the whole screen red with 112, the operations line and "I'm safe now". The alert itself (owner, staff
// and emergency contact told, with the location) is Phase 5: until then this shows in /dev only.

const t = messages.driverSos;
const HOLD_MS = 2000;
const R = 88;
const C = 2 * Math.PI * R;
const clock = () => performance.now();

export function SosButton({ onFire, compact }: { onFire: () => void; compact?: boolean }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const started = useRef(0);
  const frame = useRef(0);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    setHolding(false);
    setProgress(0);
  };
  const tick = () => {
    const p = Math.min(1, (clock() - started.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stop();
      navigator.vibrate?.(200);
      onFire();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    started.current = clock();
    setHolding(true);
    frame.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <>
      <button
        type="button"
        aria-label={t.label}
        aria-describedby="sos-hint"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className={cn("grid shrink-0 touch-none place-items-center rounded-full bg-[#D92D20] font-bold text-white shadow-[0_0_0_6px_rgba(217,45,32,0.18)] select-none", compact ? "size-14 text-body" : "size-16 text-title-3")}
      >
        SOS
      </button>
      <span id="sos-hint" className="sr-only">
        {t.hint}
      </span>
      {holding ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70 px-8 text-center" aria-live="assertive">
          <div className="relative grid size-50 place-items-center">
            <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
              <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
              <circle cx="100" cy="100" r={R} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
            </svg>
            <span className="grid size-40 place-items-center rounded-full bg-[#D92D20] text-[40px] font-bold text-white">SOS</span>
          </div>
          <p className="text-title-2 text-white">{t.keepHolding}</p>
          <p className="text-[17px] text-white/85">{t.hint}</p>
        </div>
      ) : null}
    </>
  );
}

export function SosActive({ who, near, opsPhone, onSafe }: { who: string; near: string; opsPhone?: string; onSafe: () => void }) {
  return (
    <div role="alertdialog" aria-labelledby="sos-title" className="fixed inset-0 z-50 flex flex-col bg-[#B42318] px-5 pt-16 pb-8 text-white">
      <span className="mx-auto grid size-24 place-items-center rounded-full bg-white/15">
        <Shield aria-hidden className="size-10" strokeWidth={1.8} />
      </span>
      <h1 id="sos-title" className="mt-6 text-center text-[30px] leading-tight font-bold">
        {t.title}
      </h1>
      <p className="mt-2 text-center text-[17px] text-white/90">{t.told.replace("{who}", who).replace("{near}", near)}</p>
      <div className="mt-8 flex flex-col gap-3">
        {[
          { label: t.emergency, number: "112" },
          { label: t.ops, number: opsPhone ?? t.opsPlaceholder },
        ].map((line) => (
          <div key={line.label} className="flex items-center justify-between gap-3 rounded-card bg-black/15 p-4.5">
            <span>
              <span className="block text-meta text-white/80">{line.label}</span>
              <span className="block text-title-2 font-bold">{line.number}</span>
            </span>
            {/^\+?\d+$/.test(line.number) ? (
              <a href={`tel:${line.number}`} className="inline-flex h-11 items-center gap-2 rounded-pill bg-white px-5 text-body font-semibold text-[#B42318]">
                <Phone aria-hidden className="size-4.5" strokeWidth={1.8} />
                {t.call}
              </a>
            ) : null}
          </div>
        ))}
      </div>
      <button type="button" onClick={onSafe} className="mt-auto h-17 w-full rounded-button bg-white text-[17px] font-semibold text-[#B42318]">
        {t.safe}
      </button>
    </div>
  );
}
