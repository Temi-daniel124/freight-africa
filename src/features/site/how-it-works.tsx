import messages from "@/messages/en.json";
import { SectionHeading } from "./section-heading";
import { stepIllustrations } from "./step-illustrations";

const t = messages.home.how;

// How it works (Gate 3 target): four numbered cards, each with a small app screen on top.
export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="py-18 lg:py-28">
      <div className="mx-auto max-w-300 px-5 lg:px-6">
        <SectionHeading id="how-title" label={messages.home.labels.how} title={t.title} lead={t.lead} />
        <ol className="grid gap-3 lg:grid-cols-4 lg:gap-4">
          {t.steps.map((step, index) => {
            const Illustration = stepIllustrations[index];
            return (
              <li key={step.title} className="flex flex-col rounded-card bg-paper p-2 pb-6">
                <Illustration />
                <span className="tabular mx-4 mt-5 text-label leading-4 font-semibold tracking-plate text-green-500">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mx-4 mt-2 text-title-2 text-ink">{step.title}</h3>
                <p className="mx-4 mt-2 text-body text-wrap text-ink-2">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
