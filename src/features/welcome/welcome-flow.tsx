"use client";

import { ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { AnimatePresence, m, useMotionValue, useTransform, animate, type PanInfo } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SafeTripScene, TrackScene } from "@/components/art/scenes";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { InstallCard } from "./install-card";

const t = messages.welcome;
import { WELCOME_COOKIE } from "./cookie";

function remember() {
  document.cookie = `${WELCOME_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}

/** The three pictures: the placeholder person (replace before launch), the safe-trip scene, the tracking scene. */
function Picture({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative mx-auto aspect-[604/700] w-full max-w-72">
        <div aria-hidden className="absolute inset-x-6 bottom-0 h-3/5 rounded-full bg-green-50" />
        <Image src="/art/courier-placeholder.webp" alt="" fill priority sizes="288px" className="object-contain object-bottom" />
      </div>
    );
  }
  return index === 1 ? <SafeTripScene className="mx-auto max-w-80" /> : <TrackScene className="mx-auto max-w-80" />;
}

/**
 * W-00 and W-01 (D045). Three slides that follow the finger: the picture moves a little slower than the
 * words; Skip top right; progress pills bottom left; the deep green Next button bottom right shows 1, 2, 3
 * with a quick vertical slide, and an arrow on the last. Then the Welcome screen.
 */
export function WelcomeFlow() {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const x = useMotionValue(0);
  const slowX = useTransform(x, (value) => value * 0.6);
  const slides = t.slides;

  const go = (next: number) => {
    if (next >= slides.length) {
      remember();
      setDone(true);
      return;
    }
    setIndex(Math.max(0, next));
    animate(x, 0, { type: "spring", stiffness: 380, damping: 40 });
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1);
    else animate(x, 0, { type: "spring", stiffness: 380, damping: 40 });
  };

  if (done) return <WelcomeScreen />;

  const slide = slides[index];
  return (
    <div className="flex min-h-dvh flex-col bg-surface md:items-center md:justify-center md:bg-paper">
      <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-surface md:min-h-0 md:max-w-105 md:rounded-card md:shadow-card">
        <header className="flex h-16 items-center justify-between px-5">
          <Logo variant="primary-green" className="h-7 w-auto" priority />
          <button type="button" onClick={() => go(slides.length)} className="grid h-11 place-items-center px-3 text-body-sm font-semibold text-ink-2">
            {t.skip}
          </button>
        </header>
        <m.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          style={{ x }}
          onDragEnd={onDragEnd}
          className="flex flex-1 touch-pan-y flex-col px-6"
          aria-roledescription="carousel"
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.24 }} className="flex flex-1 flex-col">
              <m.div style={{ x: slowX }} className="flex flex-1 items-end justify-center pt-2 pb-6">
                <Picture index={index} />
              </m.div>
              <div className="flex flex-col gap-2 pb-6" aria-live="polite">
                <h1 className="text-[28px] leading-[34px] font-semibold text-balance text-ink">{slide.title}</h1>
                <p className="text-body text-ink-2">{slide.text}</p>
              </div>
            </m.div>
          </AnimatePresence>
        </m.div>
        <footer className="flex items-center justify-between pb-[max(env(safe-area-inset-bottom),20px)] pl-6">
          {/* Progress pills: they show where you are; swiping or Next moves on (tap targets stay large). */}
          <div className="flex gap-1.5" aria-hidden>
            {slides.map((s, i) => (
              <span key={s.title} className={cn("h-2 rounded-pill transition-all duration-200", i === index ? "w-6 bg-green-900" : "w-2 bg-line-strong")} />
            ))}
          </div>
          {/* The shaped Next button: a deep green quarter-round block holding the number. */}
          <button type="button" onClick={() => go(index + 1)} aria-label={index === slides.length - 1 ? t.start : t.next} className="relative grid h-24 w-28 place-items-center rounded-tl-[56px] bg-green-900 text-white active:scale-press">
            <span className="grid size-14 place-items-center overflow-hidden rounded-full bg-white text-title-2 font-semibold text-green-900">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.span key={index === slides.length - 1 ? "arrow" : index} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.18 }} className="block">
                  {index === slides.length - 1 ? <ArrowRight aria-hidden className="size-6" strokeWidth={2} /> : index + 1}
                </m.span>
              </AnimatePresence>
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
}

/** W-01 Welcome: the picture, the line, two tiles, Get started and Sign in; then the install card. */
export function WelcomeScreen() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface md:items-center md:justify-center md:bg-paper">
      <div className="flex min-h-dvh w-full flex-col px-6 pb-[max(env(safe-area-inset-bottom),24px)] md:min-h-0 md:max-w-105 md:rounded-card md:py-8 md:shadow-card">
        <header className="flex h-16 items-center">
          <Logo variant="primary-green" className="h-7 w-auto" priority />
        </header>
        <h1 className="mt-2 text-[28px] leading-[34px] font-semibold text-balance text-ink">{t.title}</h1>
        <div className="flex flex-1 items-center justify-center py-4">
          <SafeTripScene className="max-w-80" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tile icon={<Truck aria-hidden className="size-5" strokeWidth={1.75} />} label={t.easyBooking} />
          <Tile icon={<ShieldCheck aria-hidden className="size-5" strokeWidth={1.75} />} label={t.paymentHeld} />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <Link href="/auth?mode=start" className={buttonVariants({ className: "w-full" })}>
            {t.getStarted}
          </Link>
          <Link href="/auth?mode=signin" className={buttonVariants({ variant: "secondary", className: "w-full" })}>
            {t.signIn}
          </Link>
        </div>
      </div>
      <InstallCard />
    </div>
  );
}

function Tile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-tile border border-line bg-surface px-3 py-4 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-green-50 text-green-700">{icon}</span>
      <span className="text-label font-semibold text-ink">{label}</span>
    </div>
  );
}
