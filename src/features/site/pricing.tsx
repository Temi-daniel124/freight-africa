"use client";

import { Check, Gift } from "lucide-react";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Eyebrow } from "./section-heading";

type PricingProps = {
  label: string;
  t: {
    title: string;
    lead: string;
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

// Pricing (Gate 3 target, same layout as the launch page): how pricing works, never the numbers behind it
// (D031). The copy and the Senders / Truck owners switch on the left; one card on the right. Switching is
// instant: no fade.
export function Pricing({ label, t }: PricingProps) {
  const [side, setSide] = useState<"senders" | "owners">("senders");
  const options = [
    { value: "senders", label: t.senders },
    { value: "owners", label: t.owners },
  ] as const;
  const senders = side === "senders";
  const points = senders ? t.sendersPoints : t.ownersPoints;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-paper py-18 lg:py-28">
      <div className="mx-auto grid max-w-300 gap-8 px-5 lg:grid-cols-pricing lg:items-center lg:gap-16 lg:px-6">
        <div className="flex flex-col">
          <Eyebrow>{label}</Eyebrow>
          <h2 id="pricing-title" className="type-section mt-3.5 text-balance text-ink lg:mt-4">
            {t.title}
          </h2>
          <p className="type-section-lead mt-5 max-w-120 text-wrap text-ink-2">{t.lead}</p>
          <SegmentedControl className="mt-6 w-full lg:mt-8 lg:max-w-114" label={t.label} options={options} value={side} onChange={setSide} />
        </div>
        <div>
          <div className="rounded-card bg-surface p-6 shadow-raised lg:rounded-sheet lg:p-10" aria-live="polite">
            <h3 className="type-plan-title text-ink">{senders ? t.sendersTitle : t.ownersTitle}</h3>
            <ul className="mt-5 flex flex-col">
              {points.map((point, index) => (
                <li key={point} className={index === 0 ? "flex gap-3 pt-1 pb-3.5 lg:gap-4 lg:pb-4.5" : "flex gap-3 border-t border-line py-3.5 lg:gap-4 lg:py-4.5"}>
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-pill bg-green-100 text-green-700">
                    <Check className="size-3.75" strokeWidth={2.25} />
                  </span>
                  <span className="type-plan-point text-wrap text-ink">{point}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-pill bg-road-yellow-100 px-3.5 py-2 text-body-sm font-semibold text-ink lg:px-4 lg:py-0 lg:text-body lg:font-semibold">
              <Gift aria-hidden className="size-4.5 shrink-0" strokeWidth={1.75} />
              {t.offer}
            </p>
          </div>
          <p className="mt-5 max-w-160 text-label leading-5 font-normal tracking-normal text-wrap text-ink-2">{t.notice}</p>
        </div>
      </div>
    </section>
  );
}
