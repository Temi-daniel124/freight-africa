import Image from "next/image";
import messages from "@/messages/en.json";
import { HeroCard } from "./hero-card";
import { type HeroPhoto, HeroSlideshow } from "./hero-slideshow";

const t = messages.home.hero;

// Licensed filler photos taken in Nigeria, plates blurred (public/photos/CREDITS.md, D031).
const photos: HeroPhoto[] = [
  { name: "hero-lagos", position: "60% 50%" },
  { name: "hero-okene", position: "30% 50%" },
  { name: "hero-truck-park", position: "50% 60%" },
  { name: "hero-ibadan", position: "55% 50%" },
];

export function Hero() {
  return (
    <section className="hero-height relative isolate flex items-center overflow-hidden bg-green-800 text-white">
      {/* Photo 1 is the largest content on the page; React moves these links into <head>. */}
      <link rel="preload" as="image" type="image/avif" href="/photos/hero-lagos-828.avif" media="(width < 37.5rem)" fetchPriority="high" />
      <link rel="preload" as="image" type="image/avif" href="/photos/hero-lagos-1920.avif" media="(width >= 37.5rem)" fetchPriority="high" />
      <HeroSlideshow photos={photos} pauseLabel={t.pause} playLabel={t.play} />
      {/* Faint Africa outline from the logo, at 4% (DESIGN_SYSTEM.md 6.4) */}
      <Image
        src="/brand/svg/icon-white.svg"
        alt=""
        width={572}
        height={620}
        unoptimized
        loading="eager"
        className="pointer-events-none absolute -top-12 -right-40 -z-10 h-160 w-auto opacity-4 lg:-right-16 lg:h-200"
      />
      {/* The road line running through the hero */}
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 w-full" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path
          d="M-40 150 C 320 90, 640 160, 960 96 S 1360 40, 1480 56"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="12 10"
          vectorEffect="non-scaling-stroke"
          className="stroke-green-500"
        />
      </svg>
      <div className="mx-auto grid w-full max-w-site gap-8 px-4 pt-28 pb-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-6 lg:pt-32 lg:pb-24">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <p className="inline-flex h-8 items-center gap-2 self-start rounded-pill bg-green-900 px-3 text-label">
            <span aria-hidden className="size-2 rounded-pill bg-road-yellow" />
            {t.badge}
          </p>
          <h1 className="type-hero">{t.headline}</h1>
          <p className="type-lead max-w-text text-on-green">{t.lead}</p>
        </div>
        <div className="lg:col-span-5">
          <HeroCard t={t} />
        </div>
      </div>
    </section>
  );
}
