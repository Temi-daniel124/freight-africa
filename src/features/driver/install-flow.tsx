"use client";

import { Check, ChevronLeft, LoaderCircle, Plus, Share, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { installCheckin, installStarted, makeSetupCode } from "./install-actions";

// DV05–DV05e install with real detection (D052). Install, or the browser saying "accepted", only moves
// to Waiting. Installed means the app opened from the home screen and checked in with our server.

const t = messages.driverInstall;
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export type InstallView = "start" | "waiting" | "failed" | "ios" | "done";
const DEVICE_KEY = "fa-device";

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const platform = () => (isIos() ? "ios" : /Android/.test(navigator.userAgent) ? "android" : /Mobi/.test(navigator.userAgent) ? "other" : "desktop");
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function AppCard({ chip, tone }: { chip: string; tone: "muted" | "waiting" | "done" }) {
  return (
    <div className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-4">
      <span className="grid size-14 shrink-0 place-items-center rounded-callout bg-green-900">
        <Image src="/brand/svg/icon-white.svg" alt="" width={32} height={35} unoptimized className="h-8 w-auto" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-ink">{t.app}</span>
        <span className="block truncate text-meta text-ink-3">{t.appSub}</span>
      </span>
      <span className={cn("inline-flex h-7.5 shrink-0 items-center gap-1.5 rounded-pill px-3 text-meta font-semibold", tone === "waiting" ? "bg-warning-100 text-warning" : tone === "done" ? "bg-green-50 text-green-800" : "bg-[#EEF0EC] text-ink-2")}>
        {tone === "waiting" ? <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" strokeWidth={2} /> : null}
        {chip}
      </span>
    </div>
  );
}

function Steps({ items }: { items: { icon?: typeof Share; text: string }[] }) {
  return (
    <ol className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      {items.map((item, i) => (
        <li key={item.text} className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-icon bg-green-50 text-[17px] font-semibold text-green-800">
            {item.icon ? <item.icon aria-hidden className="size-5" strokeWidth={1.8} /> : i + 1}
          </span>
          <span className="text-[16px] leading-snug font-semibold text-ink">{item.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function InstallFlow({ next, preview }: { next: string; preview?: InstallView }) {
  const [view, setView] = useState<InstallView>(preview ?? "start");
  const [inApp, setInApp] = useState(false);
  const [code, setCode] = useState<string | null>(preview === "ios" ? "482915" : null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const deferred = useRef<InstallEvent | null>(null);

  // The installed app itself: check in, and Installed shows here (DV05e).
  useEffect(() => {
    if (preview) return;
    const onPrompt = (e: Event) => (e.preventDefault(), (deferred.current = e as InstallEvent));
    const onOffline = () => setView((v) => (v === "waiting" ? "failed" : v));
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("offline", onOffline);
    const id = deviceId();
    void installCheckin(id, platform(), standalone()).then((installed) => {
      if (installed) {
        setInApp(standalone());
        setView("done");
      }
    });
    return () => (window.removeEventListener("beforeinstallprompt", onPrompt), window.removeEventListener("offline", onOffline));
  }, [preview]);

  // Waiting in the browser: ask the server every few seconds whether the home-screen app has opened.
  const poll = useCallback(() => installCheckin(deviceId(), platform(), false), []);
  useEffect(() => {
    if (preview || (view !== "waiting" && view !== "ios")) return;
    const timer = window.setInterval(async () => {
      if (await poll()) setView("done");
    }, 4000);
    return () => window.clearInterval(timer);
  }, [view, poll, preview]);

  const iphone = async () => {
    setView("ios");
    setCodeError(null);
    await installStarted(deviceId(), "ios");
    const r = await makeSetupCode();
    if ("code" in r) setCode(r.code);
    else setCodeError(r.status === "limit" ? t.ios.limit : t.ios.error);
  };

  const install = async () => {
    if (isIos()) return iphone();
    await installStarted(deviceId(), platform());
    const prompt = deferred.current;
    if (!prompt) return setView("waiting");
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferred.current = null;
    setView(outcome === "accepted" ? "waiting" : "failed");
  };

  const back = view === "start" ? null : () => setView("start");
  const head = (title: string, lead: string, step = true) => (
    <div className="flex flex-col gap-2">
      {step ? (
        <div className="mb-3 flex items-center justify-between">
          {back ? (
            <button type="button" onClick={back} aria-label={t.back} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-green-900">
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
            </button>
          ) : (
            <span />
          )}
          <p className="text-meta text-ink-3">{t.step}</p>
        </div>
      ) : null}
      <h1 className="text-title-1 text-ink">{title}</h1>
      <p className="text-[17px] text-ink-2">{lead}</p>
    </div>
  );

  if (view === "done")
    return (
      <div className="flex flex-col items-center gap-6 pt-10 text-center">
        <span className="grid size-24 place-items-center rounded-full bg-green-50 text-green-700">
          <Check aria-hidden className="size-12" strokeWidth={2} />
        </span>
        {head(t.done.title, inApp || preview ? t.done.lead : t.done.browserLead, false)}
        {inApp || preview ? (
          <Link href={next} className="mt-auto inline-flex h-17 w-full items-center justify-center rounded-button bg-green-900 text-[17px] font-semibold text-white">
            {t.done.cta}
          </Link>
        ) : null}
      </div>
    );

  if (view === "ios")
    return (
      <div className="flex flex-col gap-5">
        {head(t.ios.title, t.ios.lead)}
        <Steps items={[{ icon: Share, text: t.ios.s1 }, { icon: Plus, text: t.ios.s2 }, { icon: Smartphone, text: t.ios.s3 }]} />
        <div className="rounded-card bg-green-900 px-5 py-4.5 text-white">
          <p className="text-meta text-green-200">{t.ios.codeLabel}</p>
          <p className="mt-1 font-bold tracking-[0.04em] text-[40px] leading-tight" aria-live="polite">
            {code ? `${code.slice(0, 3)} ${code.slice(3)}` : "··· ···"}
          </p>
          <p className="text-meta text-green-200">{t.ios.codeNote}</p>
        </div>
        {codeError ? (
          <p role="alert" className="text-body text-danger">
            {codeError}
          </p>
        ) : (
          <p className="flex items-center justify-center gap-2 text-body text-ink-3">
            <LoaderCircle aria-hidden className="size-4.5 motion-safe:animate-spin" strokeWidth={1.8} />
            {t.ios.waiting}
          </p>
        )}
      </div>
    );

  if (view === "waiting")
    return (
      <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-5">
        {head(t.waiting.title, t.waiting.lead)}
        <AppCard chip={t.waiting.chip} tone="waiting" />
        <Steps items={[{ text: t.waiting.s1 }, { text: t.waiting.s2 }, { text: t.waiting.s3 }]} />
        <p className="text-meta text-ink-3">{t.waiting.note}</p>
        <div className="mt-auto flex flex-col items-center gap-4">
          <Button variant="secondary" className="h-14 w-full" onClick={install}>
            {t.waiting.again}
          </Button>
          <button type="button" onClick={iphone} className="text-body font-semibold text-green-800">
            {t.waiting.iphone}
          </button>
        </div>
      </div>
    );

  if (view === "failed")
    return (
      <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-5">
        {head(t.failed.title, t.failed.lead)}
        <AppCard chip={t.start.chip} tone="muted" />
        <ul className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4 text-[17px] text-ink">
          {[t.failed.signal, t.failed.space, t.failed.browser].map((line) => (
            <li key={line} className="flex items-center gap-3">
              <Check aria-hidden className="size-5 text-green-700" strokeWidth={2} />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col items-center gap-4">
          <Button className="h-17 w-full text-[17px]" onClick={install}>
            {t.failed.again}
          </Button>
          <Link href="/app/drive/help" className="text-body font-semibold text-green-800">
            {t.failed.help}
          </Link>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-5">
      {head(t.start.title, t.start.lead)}
      <AppCard chip={t.start.chip} tone="muted" />
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="text-meta font-semibold text-ink-3">{t.start.every}</p>
        <ul className="mt-2.5 flex flex-col gap-2.5 text-[17px] text-ink">
          {[t.start.holder, t.start.charger].map((line) => (
            <li key={line} className="flex items-center gap-3">
              <Check aria-hidden className="size-5 text-green-700" strokeWidth={2} />
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <Button className="h-17 w-full text-[17px]" onClick={install}>
          {t.start.cta}
        </Button>
        <p className="text-center text-meta text-ink-3">{t.start.note}</p>
      </div>
    </div>
  );
}
