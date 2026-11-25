import { Check, Lock, Package, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { Eyebrow } from "./section-heading";

const t = messages.home.escrow;
const stopIcons = [Lock, Package, Check];

// How payment works (Gate 3 target): the dark green band, the copy and note on the left, a trip's payment
// timeline on the right (decorative: the stages are described in the copy). Stages only, never amounts (D031).
export function PaymentBand() {
  return (
    <section aria-labelledby="payment-title" className="relative isolate mx-2 overflow-hidden rounded-card bg-green-900 py-18 text-white lg:mx-4 lg:rounded-hero lg:py-28">
      <div aria-hidden className="money-glow absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-300 gap-8 px-5 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-6">
        <div className="flex flex-col">
          <Eyebrow tone="inverse">{messages.home.labels.payment}</Eyebrow>
          <h2 id="payment-title" className="type-section mt-3.5 text-balance lg:mt-4">
            {t.title}
          </h2>
          <p className="type-section-lead mt-5 max-w-115 text-wrap text-white/80">{t.lead}</p>
          <p className="mt-8 flex max-w-115 items-start gap-3 rounded-inner border border-white/12 bg-white/7 px-4.5 py-4 text-body-sm leading-5.25 font-normal text-wrap text-white/85">
            <ShieldCheck aria-hidden className="mt-px size-5 shrink-0 text-road-yellow" strokeWidth={1.75} />
            {t.note}
          </p>
        </div>

        <div aria-hidden className="rounded-card bg-surface p-5 text-ink lg:p-7">
          <div className="mb-2 flex items-center justify-between border-b border-line pb-5">
            <b className="text-control leading-5.25 font-semibold">{t.card}</b>
            <span className="inline-flex h-6.5 items-center rounded-pill bg-info-100 px-2.5 text-caption font-semibold tracking-normal text-info">{t.status}</span>
          </div>
          {t.stops.map((stop, index) => {
            const Icon = stopIcons[index];
            const next = index === t.stops.length - 1;
            return (
              <div key={stop.stop} className="relative flex gap-4 py-4">
                {index < t.stops.length - 1 ? <span className="absolute top-15 -bottom-3 left-4.75 w-0.5 bg-green-200" /> : null}
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-nav", next ? "border border-line bg-paper text-ink-3" : "bg-green-700 text-white")}>
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="flex items-center gap-2.5 text-control leading-5.5 font-semibold">
                    {stop.stop}
                    <span className={cn("rounded-pill px-2.5 py-0.75 text-caption leading-5.5 font-semibold tracking-normal", next ? "bg-paper text-ink-2" : "bg-green-50 text-green-700")}>
                      {stop.label}
                    </span>
                  </h3>
                  <p className="mt-1 text-body-sm leading-5.25 font-normal text-wrap text-ink-2">{stop.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
