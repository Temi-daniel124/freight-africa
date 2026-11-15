"use client";

import { Truck } from "lucide-react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { springUi } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Step = { title: string; text: string };
type HowItWorksProps = { heading: ReactNode; steps: Step[]; illustrations: ReactNode[] };

function Marker({ index, active, done }: { index: number; active: boolean; done: boolean }) {
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center">
      {active ? (
        <m.span layoutId="how-truck" transition={springUi} className="absolute inset-0 flex items-center justify-center rounded-pill bg-green-700 text-white">
          <Truck aria-hidden className="size-5" strokeWidth={1.75} />
        </m.span>
      ) : (
        <span
          className={cn(
            "tabular flex size-10 items-center justify-center rounded-pill border text-label",
            done ? "border-green-700 bg-green-700 text-white" : "border-line-strong bg-surface text-ink-2",
          )}
        >
          {index + 1}
        </span>
      )}
    </span>
  );
}

// The road between two markers: solid green once travelled, dashed before.
function Segment({ travelled }: { travelled: boolean }) {
  return (
    <svg aria-hidden className="h-full w-1 overflow-visible">
      <line x1="2" y1="0" x2="2" y2="100%" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 10" className="stroke-line-strong" />
      <line
        x1="2"
        y1="0"
        x2="2"
        y2="100%"
        strokeWidth="3"
        strokeLinecap="round"
        className={cn("stroke-green-700 transition-opacity motion-standard", travelled ? "opacity-100" : "opacity-0")}
      />
    </svg>
  );
}

// DESIGN_SYSTEM.md 13.3 item 3: a scroll story. The step list stays put on desktop while the cards scroll;
// the road fills and the truck moves to the step in view.
export function HowItWorks({ heading, steps, illustrations }: HowItWorksProps) {
  const [active, setActive] = useState(0);
  const cards = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    cards.current.forEach((card) => card && observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="bg-paper py-16 lg:py-24">
      <div className="mx-auto flex max-w-site flex-col gap-10 px-4 lg:gap-12 lg:px-6">
        {heading}
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <ol className="hidden lg:sticky lg:top-24 lg:col-span-5 lg:flex lg:flex-col lg:self-start">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <Marker index={index} active={index === active} done={index < active} />
                  {index < steps.length - 1 ? (
                    <div className="min-h-16 flex-1 py-2">
                      <Segment travelled={index < active} />
                    </div>
                  ) : null}
                </div>
                {/* Inactive steps dim only the heading colour: fading the whole block took the body text below 4.5:1. */}
                <div className="flex flex-col gap-1 pt-2 pb-8">
                  <h3 className={cn("type-h3 transition-colors motion-standard", index === active ? "text-ink" : "text-ink-2")}>{step.title}</h3>
                  <p className="type-copy text-ink-2">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <ol className="flex flex-col gap-10 lg:col-span-7 lg:gap-24 lg:py-12">
            {steps.map((step, index) => (
              <li
                key={step.title}
                ref={(node) => {
                  cards.current[index] = node as HTMLDivElement | null;
                }}
                data-step={index}
                className="flex gap-4 lg:block"
              >
                <div className="flex flex-col items-center lg:hidden">
                  <span className="tabular flex size-10 shrink-0 items-center justify-center rounded-pill bg-green-700 text-label text-white">{index + 1}</span>
                  {index < steps.length - 1 ? (
                    <div className="flex-1 pt-2">
                      <Segment travelled={false} />
                    </div>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-1 pt-2 lg:hidden">
                    <h3 className="type-h3 text-ink">{step.title}</h3>
                    <p className="type-copy text-ink-2">{step.text}</p>
                  </div>
                  <div className="lg:mx-auto lg:w-full lg:max-w-md">{illustrations[index]}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
