"use client";

import { Banknote, HandCoins, Lock, MapPin, Repeat2, Tag } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";

type Benefit = { title: string; text: string };
type AudienceSwitchProps = {
  heading: ReactNode;
  t: {
    label: string;
    senders: string;
    owners: string;
    sendersBenefits: Benefit[];
    ownersBenefits: Benefit[];
    sendersAction: string;
    ownersAction: string;
  };
};

const icons = { senders: [Tag, Lock, MapPin], owners: [Banknote, HandCoins, Repeat2] };

export function AudienceSwitch({ heading, t }: AudienceSwitchProps) {
  const [audience, setAudience] = useState<"senders" | "owners">("senders");
  const options = [
    { value: "senders", label: t.senders },
    { value: "owners", label: t.owners },
  ] as const;
  const benefits = audience === "senders" ? t.sendersBenefits : t.ownersBenefits;

  return (
    <section aria-labelledby="audience-title" className="bg-paper py-16 lg:py-24">
      <div className="mx-auto flex max-w-site flex-col gap-8 px-4 lg:gap-10 lg:px-6">
        {heading}
        <SegmentedControl className="w-full max-w-96" label={t.label} options={options} value={audience} onChange={setAudience} />
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={audience} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col gap-8">
            <ul className="grid gap-4 sm:grid-cols-3">
              {benefits.map((benefit, index) => {
                const Icon = icons[audience][index];
                return (
                  <li key={benefit.title} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
                    <span className="flex size-10 items-center justify-center rounded-pill bg-green-50 text-green-700">
                      <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                    </span>
                    <h3 className="type-h3 text-ink">{benefit.title}</h3>
                    <p className="type-copy text-ink-2">{benefit.text}</p>
                  </li>
                );
              })}
            </ul>
            <Link href={`/waitlist?role=${audience === "senders" ? "shipper" : "owner"}`} className={buttonVariants({ className: "self-start max-sm:w-full" })}>
              {audience === "senders" ? t.sendersAction : t.ownersAction}
            </Link>
          </m.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
