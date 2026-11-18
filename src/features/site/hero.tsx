import { Lock, MapPin, ShieldCheck } from "lucide-react";
import messages from "@/messages/en.json";
import { HeroBar } from "./hero-bar";
import { type HeroPhoto, HeroSlideshow } from "./hero-slideshow";

const t = messages.home.hero;

// Licensed filler photos taken in Nigeria, plates blurred (public/photos/CREDITS.md, D031). The truck park
// comes first, as in the Gate 2 target; it is the one preloaded below.
const photos: HeroPhoto[] = [
  { name: "hero-truck-park", position: "50% 62%", phone: "58% 60%" },
  { name: "hero-lagos", position: "60% 50%" },
  { name: "hero-okene", position: "30% 50%" },
  { name: "hero-ibadan", position: "55% 50%" },
];

const proofIcons = { verified: ShieldCheck, held: Lock, tracking: MapPin } as const;

// The landing hero, built to the approved Gate 2 target (docs/design/targets/gate-2): an inset rounded
// photo with the copy on its dark side, the waitlist bar on its bottom edge, and the proof row below.
// Everything is visible on first paint; only the photos crossfade.
export function Hero() {
  return (
    <>
      <section className="relative isolate mx-2 mt-2 h-140 overflow-hidden rounded-card bg-green-900 text-white lg:mx-4 lg:mt-4 lg:h-170 lg:rounded-hero">
        {/* Photo 1 is the largest content on the page; React moves these links into <head>. */}
        <link rel="preload" as="image" type="image/avif" href="/photos/hero-truck-park-828.avif" media="(width < 64rem)" fetchPriority="high" />
        <link rel="preload" as="image" type="image/avif" href="/photos/hero-truck-park-1920.avif" media="(width >= 64rem)" fetchPriority="high" />
        <HeroSlideshow photos={photos} pauseLabel={t.pause} playLabel={t.play} photosLabel={t.photosLabel} />

        <div className="absolute inset-x-0 bottom-28 mx-auto max-w-300 px-5 lg:top-49 lg:bottom-auto lg:px-6">
          <p className="inline-flex h-7 items-center gap-2 rounded-pill border border-white/22 bg-white/14 pr-3.5 pl-3 text-caption font-semibold tracking-normal backdrop-blur-sm lg:h-8 lg:text-label">
            <span aria-hidden className="size-2 rounded-pill bg-road-yellow ring-3 ring-road-yellow/25" />
            {t.badge}
          </p>
          <h1 className="type-hero-xl mt-4 max-w-160 text-balance lg:mt-6">{t.headline}</h1>
          <p className="type-hero-lead mt-3 max-w-130 text-wrap text-white/86 lg:mt-5">{t.lead}</p>
        </div>
      </section>

      <div className="relative z-5 mx-auto -mt-20 max-w-270 px-4 lg:-mt-23 lg:px-6">
        <HeroBar t={t} corridors={messages.site.corridors} />
      </div>

      <ul className="mx-auto mt-6 grid max-w-270 gap-4 px-5 pb-12 lg:mt-7 lg:grid-cols-3 lg:gap-6 lg:px-6 lg:pb-16">
        {messages.home.proof.map((item) => {
          const Icon = proofIcons[item.icon as keyof typeof proofIcons];
          return (
            <li key={item.title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-nav bg-green-50 text-green-700">
                <Icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <span>
                <b className="block text-body leading-5 font-bold text-ink">{item.title}</b>
                <span className="mt-0.5 block text-body-sm leading-5 font-normal text-wrap text-ink-2">{item.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
