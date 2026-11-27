"use client";

import { Bell, Check, Plus, Share, SquarePlus } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import messages from "@/messages/en.json";

const t = messages.welcome.install;
const KEY = "fa_install_prompt";
const WEEK = 7 * 24 * 60 * 60 * 1000;

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Seen = { count: number; until: number };

function readSeen(): Seen {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "") as Seen;
    return { count: Number(value.count) || 0, until: Number(value.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * P06c install sheet: on a phone, once, after the sender's first payment (on Finding your truck). The app
 * icon, one line, two promises, Install and a quiet Not now. Not now hides it for 7 days; it appears 3 times
 * at most. On iPhone, Install shows the three Add to Home Screen pictures.
 */
export function InstallCard({ preview = false }: { preview?: boolean }) {
  const [show, setShow] = useState(preview);
  const [iphoneSteps, setIphoneSteps] = useState(false);
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    const seen = readSeen();
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (preview || !phone || isStandalone() || seen.count >= 3 || Date.now() < seen.until) return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    const timer = window.setTimeout(() => {
      setShow(true);
      localStorage.setItem(KEY, JSON.stringify({ count: seen.count + 1, until: 0 }));
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, [preview]);

  const notNow = () => {
    const seen = readSeen();
    localStorage.setItem(KEY, JSON.stringify({ count: seen.count, until: Date.now() + WEEK }));
    setShow(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setShow(false);
      return;
    }
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) setIphoneSteps(true);
    else notNow();
  };

  return (
    <AnimatePresence>
      {show ? (
        <>
          <m.div key="scrim" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={notNow} className="fixed inset-0 z-50 bg-scrim" />
          <m.div
            key="sheet"
            role="dialog"
            aria-modal
            aria-label={t.title}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-sheet bg-surface px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),30px)] shadow-sheet"
          >
            <div aria-hidden className="mx-auto mb-4.5 h-1 w-10 rounded-pill bg-grab" />
            {iphoneSteps ? (
              <div className="flex flex-col gap-4">
                <p className="text-title-3 text-ink">{t.iphoneTitle}</p>
                <ol className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: <Share aria-hidden className="size-6" strokeWidth={1.75} />, text: t.iphone1 },
                    { icon: <SquarePlus aria-hidden className="size-6" strokeWidth={1.75} />, text: t.iphone2 },
                    { icon: <Plus aria-hidden className="size-6" strokeWidth={1.75} />, text: t.iphone3 },
                  ].map((step, i) => (
                    <li key={step.text} className="flex flex-col items-center gap-2 rounded-tile bg-paper p-3">
                      <span className="grid size-11 place-items-center rounded-full bg-surface text-green-700 shadow-raised">{step.icon}</span>
                      <span className="text-caption font-semibold text-ink-2">
                        {i + 1}. {step.text}
                      </span>
                    </li>
                  ))}
                </ol>
                <Button variant="secondary" onClick={notNow} className="w-full">
                  {t.done}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3.5">
                  <span className="grid size-16 shrink-0 place-items-center rounded-callout bg-green-900 shadow-[0_14px_24px_-14px_rgba(8,56,38,0.8)]">
                    <Image src="/brand/svg/icon-white.svg" alt="" width={38} height={41} unoptimized className="h-9.5 w-auto" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-title-3 text-ink">{t.title}</span>
                    <span className="mt-0.5 block text-meta text-ink-3">{t.text}</span>
                  </span>
                </div>
                <ul className="mt-4.5 flex flex-col gap-3">
                  {[
                    { icon: <Check aria-hidden className="size-4.5" strokeWidth={1.8} />, text: t.point1 },
                    { icon: <Bell aria-hidden className="size-4.5" strokeWidth={1.8} />, text: t.point2 },
                  ].map((point) => (
                    <li key={point.text} className="flex items-center gap-3 text-meta text-ink">
                      <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">{point.icon}</span>
                      {point.text}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => void install()} className="mt-5 w-full">
                  {t.install}
                </Button>
                <Button variant="tertiary" size="text" onClick={notNow} className="w-full text-ink-2 hover:bg-transparent">
                  {t.notNow}
                </Button>
              </>
            )}
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
