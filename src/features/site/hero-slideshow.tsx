"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export type HeroPhoto = { name: string; position: string };

type HeroSlideshowProps = { photos: HeroPhoto[]; pauseLabel: string; playLabel: string };

const SLIDE_MS = 6000;
const PHONE = "(width < 37.5rem)";

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
        className="size-full object-cover"
        style={{ objectPosition: photo.position }}
      />
    </picture>
  );
}

// DESIGN_SYSTEM.md 13.3: four photos crossfading every 6 s with a slow zoom. Photo 1 is preloaded; 2 to 4
// load after the first paint. Pauses when the tab is hidden; reduced motion shows photo 1 only.
export function HeroSlideshow({ photos, pauseLabel, playLabel }: HeroSlideshowProps) {
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
      <div aria-hidden className="absolute inset-0 -z-20 bg-green-800">
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
        <div className="hero-scrim absolute inset-0" />
      </div>
      {/* WCAG 2.2.2: anything that moves for more than 5 s can be paused. */}
      {reduced ? null : (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? playLabel : pauseLabel}
          aria-pressed={paused}
          className="absolute bottom-4 left-4 z-10 inline-flex size-11 items-center justify-center rounded-pill border border-white/30 bg-green-900/50 text-white backdrop-blur-sm transition-colors hover:bg-green-900/70 lg:bottom-6 lg:left-6"
        >
          {paused ? <Play aria-hidden className="size-4 fill-current" strokeWidth={1.75} /> : <Pause aria-hidden className="size-4 fill-current" strokeWidth={1.75} />}
        </button>
      )}
    </>
  );
}
