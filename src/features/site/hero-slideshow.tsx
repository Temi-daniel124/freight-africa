"use client";

import { Play } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/** `position` is the focal point from 1024 px; `phone` the focal point below it, when it differs. */
export type HeroPhoto = { name: string; position: string; phone?: string };

type HeroSlideshowProps = { photos: HeroPhoto[]; pauseLabel: string; playLabel: string; photosLabel: string };

const SLIDE_MS = 6000;
// Below 1024 px the hero uses the phone layout, and the portrait crop (Gate 2 target).
const PHONE = "(width < 64rem)";

function Photo({ photo, eager }: { photo: HeroPhoto; eager: boolean }) {
  const base = `/photos/${photo.name}`;
  return (
    <picture>
      <source media={PHONE} type="image/avif" srcSet={`${base}-828.avif`} />
      <source media={PHONE} type="image/webp" srcSet={`${base}-828.webp`} />
      <source type="image/avif" srcSet={`${base}-1920.avif`} />
      <img
        src={`${base}-1920.webp`}
        alt=""
        width={1920}
        height={1280}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "low"}
        className="object-photo size-full object-cover"
        style={{ "--photo-pos": photo.position, "--photo-pos-phone": photo.phone ?? photo.position } as CSSProperties}
      />
    </picture>
  );
}

// DESIGN_SYSTEM.md 13.3: four photos crossfading every 6 s with a slow zoom. Photo 1 is preloaded; 2 to 4
// load after the first paint. Pauses when the tab is hidden; reduced motion shows photo 1 only.
export function HeroSlideshow({ photos, pauseLabel, playLabel, photosLabel }: HeroSlideshowProps) {
  const reduced = usePrefersReducedMotion();
  const [loadRest, setLoadRest] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const start = () => setLoadRest(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 1200);
      return () => window.clearTimeout(id);
    }
    const onLoad = () => window.setTimeout(start, 1200);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const moving = !reduced && loadRest && !paused && !hidden;

  useEffect(() => {
    if (!moving) return;
    const id = window.setInterval(() => setActive((index) => (index + 1) % photos.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [moving, photos.length]);

  const shown = reduced ? 0 : active;

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-20 bg-green-900">
        {photos.map((photo, index) =>
          index === 0 || (loadRest && !reduced) ? (
            <div
              key={photo.name}
              className={cn("absolute inset-0 transition-opacity duration-1000 ease-in-out", index === shown ? "opacity-100" : "opacity-0")}
            >
              <div
                className={cn("size-full", !reduced && index === shown && "animate-hero-zoom")}
                style={{ animationPlayState: moving ? "running" : "paused" }}
              >
                <Photo photo={photo} eager={index === 0} />
              </div>
            </div>
          ) : null,
        )}
        <div className="hero-fade absolute inset-0" />
      </div>
      {/* Progress bars (one per photo, the current one wide and white) and the pause button.
          WCAG 2.2.2: anything that moves for more than 5 s can be paused. */}
      <div
        role="group"
        aria-label={photosLabel}
        className="absolute top-21 left-5 z-10 flex items-center gap-3 lg:top-auto lg:right-8 lg:bottom-32 lg:left-auto"
      >
        <div aria-hidden className="flex gap-1.5">
          {photos.map((photo, index) => (
            <i
              key={photo.name}
              className={cn(
                "h-1 rounded-pill transition-all duration-300 ease-out",
                index === shown ? "w-7 bg-white lg:w-10" : "w-4 bg-white/35 lg:w-6",
              )}
            />
          ))}
        </div>
        {reduced ? null : (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? playLabel : pauseLabel}
            aria-pressed={paused}
            className="grid size-8 place-items-center rounded-pill border border-white/25 bg-white/16 text-white transition-colors hover:bg-white/25 lg:size-9"
          >
            {paused ? (
              <Play aria-hidden className="size-3.5" strokeWidth={2.25} />
            ) : (
              // Two strokes, as in the Gate 2 target (Lucide's Pause draws two outlined bars).
              <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth={2.25} strokeLinecap="round">
                <path d="M9 5v14" />
                <path d="M15 5v14" />
              </svg>
            )}
          </button>
        )}
      </div>
    </>
  );
}
