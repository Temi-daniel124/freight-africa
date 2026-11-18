import { Mail, Minus, Plus } from "lucide-react";
import { CorridorText } from "@/components/ui/corridor-text";
import messages from "@/messages/en.json";
import { Eyebrow } from "./section-heading";

const t = messages.home.faq;

// Questions (Gate 3 target): the heading and help email on the left, grouped questions on the right, the
// first one open. Native <details>, so each question opens with the keyboard (Enter or Space) and works
// without JavaScript.
export function Faq() {
  return (
    <section id="questions" aria-labelledby="questions-title" className="py-18 lg:py-28">
      <div className="mx-auto grid max-w-300 gap-6 px-5 lg:grid-cols-faq lg:gap-16 lg:px-6">
        <div className="flex flex-col lg:sticky lg:top-30 lg:self-start">
          <Eyebrow>{messages.home.labels.questions}</Eyebrow>
          <h2 id="questions-title" className="type-section mt-3.5 text-balance text-ink lg:mt-4">
            {t.title}
          </h2>
          <p className="mt-4 text-body-lg font-normal text-wrap text-ink-2">{t.help}</p>
          <a
            href={`mailto:${messages.site.contactEmail}`}
            className="mt-6 inline-flex h-12 items-center gap-2 self-start rounded-pill border border-line-strong px-5 text-body font-semibold text-ink transition-colors hover:bg-green-50"
          >
            <Mail aria-hidden className="size-5" strokeWidth={1.75} />
            {messages.site.contactEmail}
          </a>
        </div>
        <div>
          {t.groups.map((group, groupIndex) => (
            <div key={group.title} className="mb-7">
              <h3 className="mb-2 text-caption leading-3.75 font-bold tracking-caps text-ink-3 uppercase">{group.title}</h3>
              {group.items.map((item, itemIndex) => (
                <details key={item.q} open={groupIndex === 0 && itemIndex === 0} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-left text-control font-semibold text-ink lg:text-body-lg lg:leading-6 lg:font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-pill bg-paper transition-colors group-open:bg-green-700 group-open:text-white">
                      <Plus className="size-4 group-open:hidden" strokeWidth={2} />
                      <Minus className="hidden size-4 group-open:block" strokeWidth={2} />
                    </span>
                  </summary>
                  <p className="pr-12 pb-5 text-body leading-6 text-wrap text-ink-2">
                    <CorridorText text={item.a} />
                  </p>
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
