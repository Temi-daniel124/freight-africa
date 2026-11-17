import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import messages from "@/messages/en.json";

const t = messages.home.final;

// The closing band: a truck park photograph (D031 filler, plates blurred) under the same green as the
// hero, the line set left like the hero, and the road line running out of the page.
export function FinalBand() {
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden bg-green-800 text-white">
      <picture>
        <source type="image/avif" srcSet="/photos/hero-truck-park-828.avif 828w, /photos/hero-truck-park-1920.avif 1920w" sizes="100vw" />
        <img
          src="/photos/hero-truck-park-1920.webp"
          srcSet="/photos/hero-truck-park-828.webp 828w, /photos/hero-truck-park-1920.webp 1920w"
          sizes="100vw"
          alt=""
          width={1920}
          height={1280}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-20 size-full object-cover object-[50%_60%]"
        />
      </picture>
      {/* Heavier than the hero's scrim: this photograph is brighter, and white text must stay at 4.5:1 or more. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(8_56_38/0.9)_0%,rgb(8_56_38/0.82)_50%,rgb(8_56_38/0.6)_100%)]" />
      <div className="mx-auto flex max-w-site flex-col items-start gap-6 px-4 py-20 lg:px-6 lg:py-32">
        <h2 id="final-title" className="type-hero max-w-2xl text-balance">
          {t.title}
        </h2>
        <p className="type-lead max-w-text text-white/90">{t.text}</p>
        <Link href="/waitlist" className={buttonVariants({ variant: "inverse", className: "max-sm:w-full" })}>
          {t.action}
        </Link>
      </div>
      <svg aria-hidden viewBox="0 0 1440 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-6 h-16 w-full">
        <path d="M-40 70 C 360 20, 720 76, 1080 34 S 1400 18, 1480 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 10" className="stroke-green-500" vectorEffect="non-scaling-stroke" />
      </svg>
    </section>
  );
}
