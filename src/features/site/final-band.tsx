import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { RoadLine } from "@/components/ui/road-line";
import messages from "@/messages/en.json";

const t = messages.home.final;

export function FinalBand() {
  return (
    <section aria-labelledby="final-title" className="bg-green-700 text-white">
      <div className="mx-auto flex max-w-site flex-col items-center gap-6 px-4 pt-16 text-center lg:px-6 lg:pt-24">
        <h2 id="final-title" className="type-h2">
          {t.title}
        </h2>
        <p className="type-lead max-w-text text-on-green">{t.text}</p>
        <Link href="/waitlist" className={buttonVariants({ variant: "inverse", className: "max-sm:w-full" })}>
          {t.action}
        </Link>
      </div>
      <RoadLine tone="inverse" className="mt-16 lg:mt-24" />
      <div className="h-8" />
    </section>
  );
}
