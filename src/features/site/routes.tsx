import { ArrowLeftRight } from "lucide-react";
import { Fragment } from "react";
import messages from "@/messages/en.json";
import { SectionHeading } from "./section-heading";

const t = messages.home.routes;

// Corridor names are stored with ⇄ between stops ("Port Harcourt ⇄ Aba ⇄ Onitsha ⇄ Enugu").
const stops = (name: string) => name.split(" ⇄ ");

// Routes (Gate 3 target): four numbered corridor cards with their stops drawn as a line.
export function Routes() {
  return (
    <section id="routes" aria-labelledby="routes-title" className="pb-18 lg:pb-28">
      <div className="mx-auto max-w-300 px-5 lg:px-6">
        <SectionHeading id="routes-title" label={messages.home.labels.routes} title={t.title} lead={t.lead} />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {messages.site.corridors.map((corridor, index) => {
            const list = stops(corridor.name);
            return (
              <li key={corridor.slug} className="flex flex-col gap-5 rounded-tile border border-line bg-surface p-5 lg:rounded-card lg:p-6">
                <div className="flex items-center justify-between">
                  <span className="tabular text-label leading-4 font-semibold tracking-plate text-green-500">{String(index + 1).padStart(2, "0")}</span>
                  <span className="inline-flex h-6.5 items-center rounded-pill border border-line bg-paper px-2.5 text-caption font-semibold tracking-normal text-ink-2">{t.status}</span>
                </div>
                {/* The stops, read in order; the dots and dashes between them are decoration. */}
                <ol aria-label={corridor.name.replaceAll(" ⇄ ", " to ")} className="flex flex-col">
                  {list.map((stop, at) => {
                    const end = at === 0 || at === list.length - 1;
                    return (
                      <Fragment key={stop}>
                        {at > 0 ? (
                          <li aria-hidden className="flex h-5.5 w-4 justify-center">
                            <b className="dash-v h-full w-0.5" />
                          </li>
                        ) : null}
                        <li className="flex items-center gap-3 text-body leading-6 font-semibold tracking-close lg:text-body-lg lg:leading-6 lg:font-semibold">
                          <span className="flex w-4 justify-center">
                            <i aria-hidden className={end ? "size-3 rounded-pill border-2 border-green-700 bg-green-700" : "size-3 rounded-pill border-2 border-green-700 bg-surface"} />
                          </span>
                          {stop}
                        </li>
                      </Fragment>
                    );
                  })}
                </ol>
                <div className="mt-auto flex items-center gap-1.5 border-t border-line pt-4 text-label font-medium tracking-normal text-ink-2">
                  <ArrowLeftRight aria-hidden className="size-4 text-green-700" strokeWidth={1.75} />
                  {t.both}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
