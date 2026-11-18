import { ArrowRight, Check, Package, Truck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { SectionHeading } from "./section-heading";

const t = messages.home.audience;

type Side = { key: "shipper" | "owner"; title: string; Icon: typeof Truck; benefits: { title: string; text: string }[]; action: string };

const sides: Side[] = [
  { key: "shipper", title: t.senders, Icon: Package, benefits: t.sendersBenefits, action: t.sendersAction },
  { key: "owner", title: t.owners, Icon: Truck, benefits: t.ownersBenefits, action: t.ownersAction },
];

// Who it's for (Gate 3 target): senders and truck owners side by side, each with its own way in.
export function Audience() {
  return (
    <section id="who" aria-labelledby="who-title" className="py-18 lg:py-28">
      <div className="mx-auto max-w-300 px-5 lg:px-6">
        <SectionHeading id="who-title" label={messages.home.labels.who} title={t.title} lead={t.lead} />
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          {sides.map(({ key, title, Icon, benefits, action }) => (
            <div key={key} className={cn("flex flex-col rounded-card px-6 py-7 lg:rounded-sheet lg:p-10", key === "shipper" ? "bg-paper" : "bg-green-50")}>
              <h3 className="type-card-title flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-field bg-surface text-green-700 shadow-raised">
                  <Icon aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                {title}
              </h3>
              <ul className="mt-8 mb-9 flex flex-col gap-5">
                {benefits.map((benefit) => (
                  <li key={benefit.title} className="flex gap-3">
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-pill bg-green-700 text-white">
                      <Check className="size-3.75" strokeWidth={2.25} />
                    </span>
                    <div>
                      <b className="block text-control leading-5.5 font-bold">{benefit.title}</b>
                      <p className="mt-0.75 text-body text-wrap text-ink-2">{benefit.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href={`/waitlist?role=${key}`}
                className={cn(
                  "mt-auto inline-flex h-13 items-center justify-center gap-2 rounded-button px-6 text-body font-bold transition-colors max-lg:w-full lg:self-start",
                  key === "shipper" ? "bg-green-700 text-white hover:bg-green-800" : "border border-line-strong bg-surface text-ink hover:bg-green-50",
                )}
              >
                {action}
                <ArrowRight aria-hidden className="size-4.5" strokeWidth={1.75} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
