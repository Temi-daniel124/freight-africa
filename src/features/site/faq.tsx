import { ChevronDown } from "lucide-react";
import messages from "@/messages/en.json";
import { SectionHeading } from "./section-heading";
import { CorridorText } from "@/components/ui/corridor-text";

const t = messages.home.faq;

export function Faq() {
  return (
    <section id="questions" aria-labelledby="questions-title" className="bg-surface py-16 lg:py-24">
      <div className="mx-auto grid max-w-site gap-10 px-4 lg:grid-cols-12 lg:gap-12 lg:px-6">
        <SectionHeading id="questions-title" title={t.title} className="lg:col-span-4" />
        <div className="flex flex-col gap-10 lg:col-span-8">
          {t.groups.map((group) => (
            <div key={group.title} className="flex flex-col">
              <h3 className="pb-2 text-label tracking-caps text-ink-2 uppercase">{group.title}</h3>
              {group.items.map((item) => (
                <details key={item.q} className="group border-b border-line">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-body-lg font-semibold text-ink">
                    {item.q}
                    <ChevronDown aria-hidden className="size-5 shrink-0 text-ink-2 transition-transform motion-quick group-open:rotate-180" strokeWidth={1.75} />
                  </summary>
                  <p className="type-copy max-w-text pb-5 text-ink-2"><CorridorText text={item.a} /></p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: t.groups.flatMap((group) =>
    group.items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
  ),
};
