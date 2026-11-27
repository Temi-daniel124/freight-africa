"use client";

import { ShieldCheck, Truck } from "lucide-react";
import { AnimatePresence, m, useMotionValue, useTransform, animate, type PanInfo } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { SlideArt, WelcomeArt } from "./art";
import { WELCOME_COOKIE } from "./cookie";

const t = messages.welcome;

function remember() {
  document.cookie = `${WELCOME_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
}

/** Phones: one column. From 1024 px: the picture on a soft green left half, the content on the right (max 440 px). */
function Split({ art, tone, children }: { art: ReactNode; tone: "white" | "paper"; children: ReactNode }) {
  return (
    <div className={cn("min-h-dvh lg:grid lg:grid-cols-2", tone === "white" ? "bg-surface" : "bg-paper")}>
      <div aria-hidden className="m-4 hidden items-center justify-center overflow-hidden rounded-hero bg-green-50 lg:flex">
        <div className="scale-125">{art}</div>
      </div>
      <div className="flex min-h-dvh flex-col lg:items-center lg:justify-center lg:px-12">
        <div className="relative flex w-full flex-1 flex-col lg:max-w-110 lg:flex-none">{children}</div>
      </div>
    </div>
  );
}

/**
 * W-00 (mockups P01, P01b, P01c). Three slides that follow the finger: the picture moves a little slower
 * than the words; Skip top right; progress pills bottom left; the deep green corner block bottom right
 * holds 1, 2, 3, with a quick vertical slide. Then the Welcome screen.
 */
export function WelcomeFlow({ seen = false }: { seen?: boolean }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(seen);
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
  const art = (
    <AnimatePresence mode="wait" initial={false}>
      <m.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }} className="w-97.5">
        <SlideArt index={index} />
      </m.div>
    </AnimatePresence>
  );
  const last = index === slides.length - 1;
  return (
    <Split art={art} tone="white">
      <header className="flex items-center justify-between px-6 pt-5 lg:px-0">
        <Logo variant="primary-green" className="h-7.5 w-auto" priority />
        <button type="button" onClick={() => go(slides.length)} className="-mr-1 grid min-h-11 place-items-center px-1 py-3 text-body font-medium text-ink-2">
          {t.skip}
        </button>
      </header>
      <m.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6} style={{ x }} onDragEnd={onDragEnd} className="flex flex-1 touch-pan-y flex-col lg:flex-none" aria-roledescription="carousel">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.24 }} className="flex flex-col">
            <m.div style={{ x: slowX }} className="mt-3 lg:hidden">
              <SlideArt index={index} />
            </m.div>
            <section className="px-7 pt-2 lg:px-0 lg:pt-12" aria-live="polite">
              <h1 className="type-slide text-balance text-ink">{slide.title}</h1>
              <p className="mt-3.5 max-w-75 text-body-lg leading-normal font-normal text-ink-2">{slide.text}</p>
            </section>
          </m.div>
        </AnimatePresence>
      </m.div>
      <footer className="mt-auto flex items-end justify-between lg:mt-12 lg:items-center">
        {/* Progress pills: they show where you are; swiping or Next moves on (tap targets stay large). */}
        <div className="mb-14.5 ml-7 flex gap-1.5 lg:mb-0 lg:ml-0" role="img" aria-label={t.slideLabel.replace("{n}", String(index + 1))}>
          {slides.map((s, i) => (
            <span key={s.title} className={cn("h-1.5 rounded-pill transition-all duration-200", i === index ? "w-6 bg-green-700" : "w-1.5 bg-line-strong")} />
          ))}
        </div>
        {/* The corner block: deep green with a 66 px top-left curve, holding the white number (a round button from 1024 px). */}
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label={last ? t.start : t.next}
          className="grid h-32 w-33 place-items-center rounded-tl-[66px] bg-green-900 pb-1 pl-2 active:scale-press lg:size-18 lg:rounded-full lg:p-0"
        >
          <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-white text-title-2 text-green-900 lg:size-12">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span key={index} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.18 }} className="block">
                {index + 1}
              </m.span>
            </AnimatePresence>
          </span>
        </button>
      </footer>
    </Split>
  );
}

/** W-01 Welcome (mockup P02): the picture, the line, two tiles, Get started and Sign in. */
export function WelcomeScreen() {
  return (
    <Split art={<WelcomeArt />} tone="paper">
      <div className="flex flex-1 flex-col pb-[max(env(safe-area-inset-bottom),34px)] lg:flex-none lg:pb-0">
        <header className="px-6 pt-5 lg:px-0">
          <Logo variant="primary-green" className="h-7.5 w-auto" priority />
        </header>
        <div className="lg:hidden">
          <WelcomeArt />
        </div>
        <section className="px-6 pt-1 lg:px-0 lg:pt-12">
          <h1 className="type-signin text-balance text-ink lg:text-[2rem] lg:leading-[1.1] lg:tracking-[-0.035em]">{t.title}</h1>
          <div className="mt-5.5 grid grid-cols-2 gap-2.5">
            <Tile icon={<Truck aria-hidden className="size-4.5" strokeWidth={1.8} />} label={t.easyBooking} />
            <Tile icon={<ShieldCheck aria-hidden className="size-4.5" strokeWidth={1.8} />} label={t.paymentHeld} />
          </div>
        </section>
        <div className="mt-auto flex flex-col gap-2.5 px-6 pt-6 lg:mt-8 lg:px-0">
          <Link href="/auth?mode=start" className={buttonVariants({ className: "w-full" })}>
            {t.getStarted}
          </Link>
          <Link href="/auth?mode=signin" className={buttonVariants({ variant: "secondary", className: "w-full" })}>
            {t.signIn}
          </Link>
        </div>
      </div>
    </Split>
  );
}

function Tile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-inner border border-line-soft bg-surface p-3">
      <span className="grid size-8.5 shrink-0 place-items-center rounded-nav-dense bg-green-50 text-green-700">{icon}</span>
      <span className="text-label leading-tight">{label}</span>
    </div>
  );
}
