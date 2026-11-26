"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Motion from the mockup READMEs ("Tokens and motion"): transform and opacity only, 60 fps, and every
// piece honours prefers-reduced-motion (MotionConfig reducedMotion="user" at the root, plus the checks
// here for the parts that are not transforms).

const settle = [0.2, 0.8, 0.2, 1] as const;

/** Mockup .okc: the circle pops in over 450 ms, then the tick draws itself over 400 ms. */
export function SuccessCheck({ label, className }: { label: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      role="img"
      aria-label={label}
      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: settle }}
      className={cn("mx-auto grid size-22 place-items-center rounded-full bg-green-50", className)}
    >
      <span className="grid size-16 place-items-center rounded-full bg-green-700">
        <svg aria-hidden viewBox="0 0 24 24" className="size-8" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <m.path d="M5 12.5l4.5 4.5L19 7.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }} />
        </svg>
      </span>
    </m.div>
  );
}

/**
 * The SOS button: press and hold for 2 s while a ring fills around it; letting go early cancels.
 * Keyboard: hold Space or Enter. With reduced motion the ring does not animate, but the hold still
 * counts the full 2 s (the hold is the safety, not the decoration).
 */
export function SosHold({ label, holdingLabel, onTrigger, size = 120 }: { label: string; holdingLabel: string; onTrigger: () => void; size?: number }) {
  const HOLD_MS = 2000;
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useReducedMotion();
  const stroke = 6;
  const r = size / 2 - stroke / 2;
  const length = 2 * Math.PI * r;

  function start() {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      if (typeof navigator !== "undefined") navigator.vibrate?.(200);
      onTrigger();
    }, HOLD_MS);
  }
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={holding ? holdingLabel : label}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") stop();
      }}
      onContextMenu={(event) => event.preventDefault()}
      className="relative grid touch-none place-items-center rounded-full bg-sos text-white shadow-button-sos select-none"
      style={{ width: size, height: size }}
    >
      <svg aria-hidden className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeOpacity={0.25} strokeWidth={stroke} />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          initial={false}
          animate={{ strokeDashoffset: holding ? 0 : length }}
          transition={holding && !reduce ? { duration: HOLD_MS / 1000, ease: "linear" } : { duration: 0.15 }}
        />
      </svg>
      <span className="relative text-title-3">SOS</span>
    </button>
  );
}

/** Numbers that roll when they change (prices, counts). Naira comes in kobo and is shown whole. */
export function RollingNumber({ value, naira = false, className }: { value: number; naira?: boolean; className?: string }) {
  return (
    <NumberFlow
      className={cn("tabular", className)}
      value={naira ? Math.round(value / 100) : value}
      prefix={naira ? "₦" : undefined}
      format={{ maximumFractionDigits: 0 }}
      locales="en-NG"
      respectMotionPreference
    />
  );
}

/** The "New" pill above a list when fresh rows arrive: slides down in, and up out when tapped. */
export function NewPill({ show, children, onPress }: { show: boolean; children: ReactNode; onPress: () => void }) {
  return (
    <AnimatePresence>
      {show ? (
        <m.button
          type="button"
          onClick={onPress}
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="sticky top-3 z-10 mx-auto flex h-9 items-center gap-1.5 rounded-pill bg-green-900 px-4 text-body-sm text-white shadow-floating"
        >
          {children}
        </m.button>
      ) : null}
    </AnimatePresence>
  );
}
