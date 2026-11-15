"use client";

import { CircleCheck, Lock, RotateCcw, Truck, Unlock } from "lucide-react";
import { useInView } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import useMeasure from "react-use-measure";
import { Button } from "@/components/ui/button";
import { springSoft, springUi } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Stop = { stop: string; label: string; text: string };
type EscrowStoryProps = {
  heading: ReactNode;
  t: { stops: Stop[]; note: string; replay: string };
};

const ICONS = [Lock, Unlock, CircleCheck];

// DESIGN_SYSTEM.md 13.3 item 4: plays once when 40% visible. Stages only, no amounts (D031).
export function EscrowStory({ heading, t }: EscrowStoryProps) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [step, setStep] = useState(0);
  const [trackRef, track] = useMeasure();
  const timers = useRef<number[]>([]);
  const last = t.stops.length - 1;

  const schedule = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [window.setTimeout(() => setStep(1), 1400), window.setTimeout(() => setStep(2), 3000)];
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
  const stage = reduce ? last : step;
  const current = t.stops[stage];
  const Icon = ICONS[stage];

  return (
    <section aria-labelledby="escrow-title" className="bg-surface py-16 lg:py-24">
      <div className="mx-auto grid max-w-site gap-10 px-4 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-6">
        <div className="flex flex-col gap-6 lg:col-span-5">
          {heading}
          <p className="text-body text-ink-2">{t.note}</p>
        </div>
        <div ref={ref} className="flex flex-col gap-6 rounded-card bg-surface p-5 shadow-raised lg:col-span-7 lg:p-8">
          <div className="flex items-center gap-4 rounded-inner bg-green-100 p-4" aria-live="polite">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-green-700 text-white">
              <Icon aria-hidden className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-label text-green-800">{current.stop}</p>
              <p className="text-title-2 text-green-900">{current.label}</p>
            </div>
          </div>

          <div className="px-5">
            <div ref={trackRef} className="relative h-10">
              <svg aria-hidden className="absolute inset-x-0 top-5 h-1 w-full overflow-visible">
                <line x1="0" y1="2" x2="100%" y2="2" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 10" className="stroke-line-strong" />
              </svg>
              <m.div
                aria-hidden
                className="absolute top-5 left-0 h-1 origin-left rounded-pill bg-green-700"
                style={{ width: track.width }}
                initial={false}
                animate={{ scaleX: stage / last }}
                transition={springSoft}
              />
              {t.stops.map((stop, index) => (
                <span
                  key={stop.stop}
                  aria-hidden
                  className={cn("absolute top-4 size-3 -translate-x-1/2 rounded-pill border-2 border-surface", index <= stage ? "bg-green-700" : "bg-line-strong")}
                  style={{ left: (track.width * index) / last }}
                />
              ))}
              <m.span
                aria-hidden
                className="absolute top-0 -left-5 flex size-10 items-center justify-center rounded-pill bg-surface text-green-700 shadow-raised"
                initial={false}
                animate={{ x: (track.width * stage) / last }}
                transition={springUi}
              >
                <Truck className="size-5" strokeWidth={1.75} />
              </m.span>
            </div>
          </div>

          <ol className="flex flex-col">
            {t.stops.map((stop, index) => {
              const reached = index <= stage;
              return (
                <li key={stop.stop} className={cn("flex gap-4 py-4", index > 0 && "border-t border-line")}>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill text-caption font-semibold transition-colors duration-300",
                      reached ? "bg-green-700 text-white" : "bg-green-50 text-ink-2",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className={cn("text-body font-semibold transition-colors duration-300", reached ? "text-ink" : "text-ink-2")}>
                      {stop.stop} · {stop.label}
                    </p>
                    <p className="text-body text-ink-2">{stop.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <Button variant="tertiary" size="text" onClick={replay} className="self-start" disabled={stage !== last || reduce}>
            <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
            {t.replay}
          </Button>
        </div>
      </div>
    </section>
  );
}
