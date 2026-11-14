"use client";

import NumberFlow from "@number-flow/react";
import { Lock, RotateCcw, Truck } from "lucide-react";
import { AnimatePresence, useInView, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import useMeasure from "react-use-measure";
import { Button } from "@/components/ui/button";
import { springSoft, springUi } from "@/lib/motion";
import { formatNaira, nairaFormat } from "@/lib/money";
import { cn } from "@/lib/utils";

type EscrowStoryProps = {
  heading: ReactNode;
  t: {
    held: string;
    keeps: string;
    stops: string[];
    rows: { label: string; amount: number }[];
    keepsDetail: string;
    replay: string;
    note: string;
  };
};

// The money held after each stop, from the worked example in docs/PRODUCT.md section 7.
const HELD = [1030000, 630000, 80000];
const LAST = HELD.length - 1;

// DESIGN_SYSTEM.md 13.3 item 4: plays once when 40% visible.
export function EscrowStory({ heading, t }: EscrowStoryProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [step, setStep] = useState(0);
  const [trackRef, track] = useMeasure();
  const timers = useRef<number[]>([]);

  const schedule = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [window.setTimeout(() => setStep(1), 1200), window.setTimeout(() => setStep(2), 2600)];
  }, []);

  const replay = () => {
    setStep(0);
    schedule();
  };

  useEffect(() => {
    if (reduce || !inView) return;
    schedule();
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, [inView, reduce, schedule]);

  // With reduced motion the story is shown already finished.
  const stage = reduce ? LAST : step;

  const truckX = (track.width * stage) / LAST;
  const visibleRows = stage === 0 ? 1 : stage === 1 ? 2 : 4;

  return (
    <section aria-labelledby="escrow-title" className="bg-surface py-16 lg:py-24">
      <div className="mx-auto grid max-w-site gap-10 px-4 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-6">
        <div className="flex flex-col gap-6 lg:col-span-5">
          {heading}
          <p className="text-body text-ink-2">{t.note}</p>
        </div>
        <div ref={ref} className="flex flex-col gap-6 rounded-card bg-surface p-5 shadow-raised lg:col-span-7 lg:p-8">
          <div className="flex items-center gap-4 rounded-inner bg-green-100 p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-green-700 text-white">
              <Lock aria-hidden className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-label text-green-900">{stage === LAST ? t.keeps : t.held}</p>
              <p className="tabular text-display text-green-900">
                <NumberFlow value={HELD[stage]} format={nairaFormat} locales="en-NG" transformTiming={{ duration: 600 }} />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5">
            <div ref={trackRef} className="relative h-10">
              <svg aria-hidden className="absolute inset-x-0 top-5 h-1 w-full overflow-visible">
                <line x1="0" y1="2" x2="100%" y2="2" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 10" className="stroke-line-strong" />
              </svg>
              <m.div
                aria-hidden
                className="absolute top-5 left-0 h-1 origin-left rounded-pill bg-green-700"
                style={{ width: track.width }}
                initial={false}
                animate={{ scaleX: stage / LAST }}
                transition={springSoft}
              />
              {t.stops.map((stop, index) => (
                <span
                  key={stop}
                  aria-hidden
                  className={cn(
                    "absolute top-4 size-3 -translate-x-1/2 rounded-pill border-2 border-surface",
                    index <= stage ? "bg-green-700" : "bg-line-strong",
                  )}
                  style={{ left: (track.width * index) / LAST }}
                />
              ))}
              <m.span
                aria-hidden
                className="absolute top-0 -left-5 flex size-10 items-center justify-center rounded-pill bg-surface text-green-700 shadow-raised"
                initial={false}
                animate={{ x: truckX }}
                transition={springUi}
              >
                <Truck className="size-5" strokeWidth={1.75} />
              </m.span>
            </div>
            <ol className="flex justify-between text-label">
              {t.stops.map((stop, index) => (
                <li key={stop} className={cn("w-20 first:-ml-10 first:text-center last:-mr-10 last:text-center", index > 0 && index < LAST && "text-center", index <= stage ? "text-ink" : "text-ink-3")}>
                  {stop}
                </li>
              ))}
            </ol>
          </div>

          <ul className="flex flex-col" aria-live="polite">
            <AnimatePresence initial={false}>
              {t.rows.slice(0, visibleRows).map((row, index) => (
                <m.li
                  key={row.label}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24 }}
                  className={cn("flex items-start justify-between gap-4 py-3", index > 0 && "border-t border-line")}
                >
                  <div className="flex flex-col">
                    <span className="text-body text-ink">{row.label}</span>
                    {index === 3 ? <span className="text-caption text-ink-2">{t.keepsDetail}</span> : null}
                  </div>
                  <span className="tabular text-body font-semibold text-ink">{formatNaira(row.amount)}</span>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>

          <Button variant="tertiary" size="text" onClick={replay} className="self-start" disabled={stage !== LAST || Boolean(reduce)}>
            <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
            {t.replay}
          </Button>
        </div>
      </div>
    </section>
  );
}
