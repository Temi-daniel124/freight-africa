import { ArrowRight } from "lucide-react";
import Link from "next/link";
import messages from "@/messages/en.json";
import { Eyebrow } from "./section-heading";

const t = messages.home.final;

// The closing call to action (Gate 3 target) on the Lagos photo (public/photos/CREDITS.md), loaded lazily
// because it sits at the end of the page.
export function FinalBand() {
  return (
    <div className="px-2 pb-2 lg:px-4 lg:pb-4">
      <section aria-labelledby="final-title" className="relative isolate flex min-h-120 items-end overflow-hidden rounded-card pb-10 text-white lg:min-h-110 lg:items-center lg:rounded-hero lg:pb-0">
        <picture>
          <source media="(width < 37.5rem)" type="image/avif" srcSet="/photos/hero-lagos-828.avif" />
          <source media="(width < 37.5rem)" type="image/webp" srcSet="/photos/hero-lagos-828.webp" />
          <source media="(width < 64rem)" type="image/avif" srcSet="/photos/hero-lagos-1200.avif" />
          <source media="(width < 64rem)" type="image/webp" srcSet="/photos/hero-lagos-1200.webp" />
          <source type="image/avif" srcSet="/photos/hero-lagos-1920.avif" />
          <img
            src="/photos/hero-lagos-1920.webp"
            alt=""
            width={1920}
            height={1280}
            loading="lazy"
            decoding="async"
            className="object-photo absolute inset-0 -z-20 size-full object-cover"
            style={{ "--photo-pos": "60% 50%" } as React.CSSProperties}
          />
        </picture>
        <div aria-hidden className="final-fade absolute inset-0 -z-10" />
        <div className="mx-auto flex w-full max-w-300 flex-col px-5 lg:px-6">
          <Eyebrow tone="inverse" className="bg-white/12">
            {messages.home.labels.launching}
          </Eyebrow>
          <h2 id="final-title" className="type-final mt-4 max-w-140 text-balance">
            {t.title}
          </h2>
          <p className="mt-4 max-w-110 text-lead text-wrap text-white/86">{t.text}</p>
          <Link
            href="/waitlist"
            className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-button bg-surface px-6 text-body font-semibold text-green-700 transition-colors hover:bg-green-50 max-lg:w-full lg:self-start"
          >
            {t.action}
            <ArrowRight aria-hidden className="size-4.5" strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </div>
  );
}
