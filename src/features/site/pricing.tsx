"use client";

import { Check, Gift } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";

type PricingProps = {
  heading: ReactNode;
  t: {
    label: string;
    senders: string;
    owners: string;
    sendersTitle: string;
    sendersPoints: string[];
    ownersTitle: string;
    ownersPoints: string[];
    offer: string;
    notice: string;
  };
};

// How pricing works, never the numbers behind it (D031). Exact figures appear in the app before confirming.
export function Pricing({ heading, t }: PricingProps) {
  const [side, setSide] = useState<"senders" | "owners">("senders");
  const options = [
    { value: "senders", label: t.senders },
    { value: "owners", label: t.owners },
  ] as const;
  const senders = side === "senders";
  const points = senders ? t.sendersPoints : t.ownersPoints;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-paper py-16 lg:py-24">
      <div className="mx-auto grid max-w-site gap-8 px-4 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-6">
        <div className="flex flex-col gap-8 lg:col-span-5">
          {heading}
          <SegmentedControl className="w-full max-w-96" label={t.label} options={options} value={side} onChange={setSide} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-7">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={side}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-6 rounded-card bg-surface p-5 shadow-raised lg:p-8"
            >
              <h3 className="type-h3 text-ink">{senders ? t.sendersTitle : t.ownersTitle}</h3>
              <ul className="flex flex-col">
                {points.map((point, index) => (
                  <li key={point} className={index > 0 ? "flex gap-3 border-t border-line py-4" : "flex gap-3 pb-4"}>
                    <span aria-hidden className="mt-px flex size-6 shrink-0 items-center justify-center rounded-pill bg-green-100 text-green-700">
                      <Check className="size-4" strokeWidth={2} />
                    </span>
                    <span className="type-copy text-ink">{point}</span>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 self-start rounded-pill bg-road-yellow-100 px-3 py-2 text-label text-ink">
                <Gift aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                {t.offer}
              </p>
            </m.div>
          </AnimatePresence>
          <p className="text-caption text-ink-2">{t.notice}</p>
        </div>
      </div>
    </section>
  );
}
