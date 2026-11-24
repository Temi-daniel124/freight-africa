"use client";

import { Plus, Share, SquarePlus } from "lucide-react";
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
 * D045 install card: on a phone, after the slides (never on top of them), a small card slides up: the app
 * icon, "Install Freight Africa", one line, Install and a quiet Not now. Not now hides it for 7 days; it
 * appears 3 times at most. On iPhone, Install shows the three Add to Home Screen pictures.
 */
export function InstallCard() {
  const [show, setShow] = useState(false);
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
    if (!phone || isStandalone() || seen.count >= 3 || Date.now() < seen.until) return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    const timer = window.setTimeout(() => {
      setShow(true);
      localStorage.setItem(KEY, JSON.stringify({ count: seen.count + 1, until: 0 }));
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

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
        <m.div
          role="dialog"
          aria-label={t.title}
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "110%" }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),12px)] z-50 rounded-card border border-line bg-surface p-4 shadow-floating"
        >
          {iphoneSteps ? (
            <div className="flex flex-col gap-4">
              <p className="text-body font-bold text-ink">{t.iphoneTitle}</p>
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
              <Button variant="secondary" size="md" onClick={notNow} className="w-full">
                {t.done}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Image src="/brand/png/app-icon-1024.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-[14px]" />
              <div className="min-w-0 flex-1">
                <p className="text-body font-bold text-ink">{t.title}</p>
                <p className="text-label font-normal text-ink-2">{t.text}</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-1">
                <Button size="sm" onClick={() => void install()}>
                  {t.install}
                </Button>
                <Button variant="tertiary" size="sm" onClick={notNow}>
                  {t.notNow}
                </Button>
              </div>
            </div>
          )}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
