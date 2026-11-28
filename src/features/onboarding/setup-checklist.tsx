import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { getSetup, type SetupRole } from "./setup";

const t = messages.onboarding.setup;

/**
 * "Finish setting up" (founder, 24 Nov 2026): the first card on Home until the role's setup is done.
 * One primary action, the next open step; the rest are listed so the person sees how far they are.
 */
export async function SetupChecklist({ role, force = false }: { role: SetupRole; force?: boolean }) {
  const real = await getSetup(role);
  // ?preview=setup (O10b): the card as a new owner sees it, with the first three steps done.
  const setup = force && real.complete ? { ...real, complete: false, steps: real.steps.map((step, i) => ({ ...step, done: i < 3 })) } : real;
  if (setup.complete) return null;
  const done = setup.steps.filter((step) => step.done).length;
  const next = setup.steps.find((step) => !step.done);
  return (
    <section aria-labelledby="setup-title" className="w-full max-w-[560px] rounded-tile bg-surface p-4.5 shadow-raised lg:rounded-card lg:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="setup-title" className="text-body-lg leading-5.5 font-semibold tracking-close text-ink">
          {t.title}
        </h2>
        <span className="shrink-0 text-label text-ink-3 tabular">
          {t.progress.replace("{done}", String(done)).replace("{total}", String(setup.steps.length))}
        </span>
      </div>
      <p className="mt-1 text-label font-normal tracking-normal text-ink-2">{t.lead[role]}</p>
      <div aria-hidden className="mt-4 h-1 overflow-hidden rounded-pill bg-line">
        <div className="h-full rounded-pill bg-green-700" style={{ width: `${Math.round((done / setup.steps.length) * 100)}%` }} />
      </div>
      <ol className="mt-4 flex flex-col">
        {setup.steps.map((step, index) => {
          const isNext = step === next;
          return (
            <li key={step.key} className="border-t border-line first:border-t-0">
              <Link href={step.href} className="flex min-h-12 items-center gap-3 py-2.5 hover:text-green-700">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-pill text-micro font-semibold tabular",
                    step.done ? "bg-green-700 text-white" : isNext ? "border-2 border-green-700 text-green-700" : "border border-line-strong text-ink-3",
                  )}
                >
                  {step.done ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : index + 1}
                </span>
                <span className={cn("min-w-0 flex-1 text-body-sm", step.done ? "text-ink-3" : "text-ink", isNext && "font-semibold")}>
                  {messages.onboarding.setup.steps[step.key]}
                  {step.optional ? <span className="ml-2 rounded-pill bg-paper px-2 py-0.5 text-micro font-semibold text-ink-3">{t.optional}</span> : null}
                  <span className="sr-only">{step.done ? `, ${t.done}` : ""}</span>
                </span>
                {step.done ? null : <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />}
              </Link>
            </li>
          );
        })}
      </ol>
      {next ? (
        <Link href={next.href} className={cn(buttonVariants({ size: "md" }), "mt-4 w-full")}>
          {t.start}: {messages.onboarding.setup.steps[next.key]}
        </Link>
      ) : null}
      {/* Drivers are added by their truck owner; they don't choose a role. */}
      {role === "driver" ? null : (
        <Link href="/onboarding/role" className={cn(buttonVariants({ variant: "tertiary", size: "text" }), "mt-3 w-full")}>
          {t.change}
        </Link>
      )}
    </section>
  );
}
