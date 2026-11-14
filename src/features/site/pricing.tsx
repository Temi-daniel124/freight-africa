"use client";

import NumberFlow from "@number-flow/react";
import { Gift } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { nairaFormat } from "@/lib/money";
import { cn } from "@/lib/utils";

type Step = { label: string; value: string };
type PricingProps = {
  heading: ReactNode;
  t: {
    label: string;
    senders: string;
    owners: string;
    sendersSteps: Step[];
    sendersStepsTitle: string;
    sendersOffer: string;
    ownersSteps: Step[];
    ownersStepsTitle: string;
    ownersOffer: string;
    exampleTitle: string;
    freight: string;
    fee: string;
    youPay: string;
    commission: string;
    youGet: string;
    ownersSplit: string;
  };
};

// Published fees only (D009, D030): no lane prices before launch.
export function Pricing({ heading, t }: PricingProps) {
  const [side, setSide] = useState<"senders" | "owners">("senders");
  const options = [
    { value: "senders", label: t.senders },
    { value: "owners", label: t.owners },
  ] as const;
  const senders = side === "senders";
  const steps = senders ? t.sendersSteps : t.ownersSteps;
  const rows = senders
    ? [
        { label: t.freight, value: 1000000 },
        { label: t.fee, value: 30000 },
        { label: t.youPay, value: 1030000 },
      ]
    : [
        { label: t.freight, value: 1000000 },
        { label: t.commission, value: -50000 },
        { label: t.youGet, value: 950000 },
      ];

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-paper py-16 lg:py-24">
      <div className="mx-auto flex max-w-site flex-col gap-8 px-4 lg:gap-10 lg:px-6">
        {heading}
        <SegmentedControl className="w-full max-w-96" label={t.label} options={options} value={side} onChange={setSide} />
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={side}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 lg:p-6"
            >
              <h3 className="type-h3 text-ink">{senders ? t.sendersStepsTitle : t.ownersStepsTitle}</h3>
              <dl className="flex flex-col">
                {steps.map((step, index) => (
                  <div key={step.label} className={cn("flex items-center justify-between gap-4 py-3", index > 0 && "border-t border-line")}>
                    <dt className="text-body text-ink-2">{step.label}</dt>
                    <dd className="tabular text-title-2 text-ink">{step.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-auto flex items-center gap-2 self-start rounded-pill bg-road-yellow-100 px-3 py-2 text-label text-ink">
                <Gift aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                {senders ? t.sendersOffer : t.ownersOffer}
              </p>
            </m.div>
          </AnimatePresence>
          <div className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-raised lg:p-6">
            <h3 className="type-h3 text-ink">{t.exampleTitle}</h3>
            <dl className="flex flex-col">
              {rows.map((row, index) => {
                const total = index === rows.length - 1;
                return (
                  <div key={index} className={cn("flex items-center justify-between gap-4 py-3", total && "border-t border-line")}>
                    <dt className={total ? "text-title-2 text-ink" : "text-body text-ink-2"}>{row.label}</dt>
                    <dd className={cn("tabular text-ink", total ? "text-title-2" : "text-body")}>
                      <NumberFlow value={row.value} format={nairaFormat} locales="en-NG" />
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className={cn("text-caption text-ink-2", senders && "invisible")} aria-hidden={senders}>
              {t.ownersSplit}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
