import { Lock, Route, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import messages from "@/messages/en.json";

const a = messages.welcome.art;
const float = "shadow-[0_18px_40px_-20px_rgba(15,26,20,0.35)]";
const floatDeep = "shadow-[0_18px_40px_-18px_rgba(8,56,38,0.6)]";

/**
 * The three slide pictures (P01, P01b, P01c), drawn in a 390 × 440 box so the titles never move between
 * slides. Decorative: the slide's title and text say the same thing.
 */
export function SlideArt({ index }: { index: number }) {
  return (
    <div aria-hidden className="relative mx-auto flex h-110 w-full max-w-97.5 items-center justify-center">
      {index === 0 ? <Trucks /> : index === 1 ? <Held /> : <Live />}
    </div>
  );
}

function Circle({ children }: { children?: React.ReactNode }) {
  return <div className="absolute size-75 overflow-hidden rounded-full bg-green-50">{children}</div>;
}

function Trucks() {
  return (
    <>
      <Circle />
      <svg width="342" height="300" viewBox="0 0 342 300" fill="none" className="absolute top-17.5 left-1/2 -translate-x-1/2">
        <path d="M18 250C70 250 64 170 130 168s70-70 130-74 60-46 66-78" className="stroke-green-500" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
      </svg>
      <Image src="/art/box.webp" alt="" width={210} height={167} priority className="relative w-52.5 drop-shadow-[0_28px_30px_rgba(15,26,20,0.18)]" />
      <div className={`absolute top-23 left-5.5 flex items-center gap-2.5 rounded-callout border border-line bg-surface py-2.5 pr-3.5 pl-2.5 ${float}`}>
        <span className="grid size-8 place-items-center rounded-[10px] bg-green-700 text-white">
          <Route className="size-4.25" strokeWidth={1.8} />
        </span>
        <span className="flex flex-col gap-px">
          <span className="text-label tracking-close">{a.route}</span>
          <span className="text-micro font-medium text-ink-3">{a.truck}</span>
        </span>
      </div>
      <div className={`absolute right-5 bottom-19 flex items-center gap-2 rounded-pill bg-green-900 py-2.25 pr-3.5 pl-2.5 text-white ${floatDeep}`}>
        <ShieldCheck className="size-4.5 text-green-300" strokeWidth={1.8} />
        <span className="text-caption font-semibold">{a.verified}</span>
      </div>
    </>
  );
}

function Held() {
  return (
    <>
      <Circle />
      <div className="relative grid size-37.5 place-items-center rounded-[44px] bg-green-900 shadow-[0_30px_50px_-24px_rgba(8,56,38,0.7)]">
        <ShieldCheck className="size-18 text-green-300" strokeWidth={1.8} />
      </div>
      <div className={`absolute top-21 left-5.5 rounded-callout border border-line bg-surface px-3.5 py-3 ${float}`}>
        <div className="text-caption text-ink-3">{a.held}</div>
        <div className="tabular text-title-3 tracking-[-0.02em]">{a.amount}</div>
      </div>
      <div className={`absolute right-5 bottom-17.5 w-50 rounded-callout border border-line bg-surface px-3.5 py-3 ${float}`}>
        <div className="flex items-center gap-2 text-caption font-semibold">
          <span className="size-2 rounded-full bg-green-700" />
          {a.loaded}
        </div>
        <div className="mt-2 flex items-center gap-2 text-caption font-semibold text-ink-3">
          <span className="size-2 rounded-full border-2 border-line-strong" />
          {a.delivered}
        </div>
      </div>
    </>
  );
}

function Live() {
  return (
    <>
      <Circle>
        <svg width="300" height="300" viewBox="0 0 300 300">
          <path d="M0 90 L300 50 M0 210 L300 170 M90 0 L120 300 M210 0 L230 300" className="stroke-white" strokeWidth="10" />
          <path d="M40 250 C 90 200, 120 180, 150 150 S 220 80, 250 60" className="stroke-green-700" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M150 150 S 220 80, 250 60" className="stroke-green-300" strokeWidth="6" fill="none" strokeDasharray="1 12" strokeLinecap="round" />
          <circle cx="40" cy="250" r="8" className="fill-white stroke-green-700" strokeWidth="4" />
          <path d="M250 30c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z" className="fill-green-900" />
          <circle cx="250" cy="46" r="6" className="fill-green-300" />
        </svg>
      </Circle>
      <div className="absolute top-45 left-[calc(50%-42px)] grid size-12 place-items-center rounded-full border-4 border-white bg-green-700 text-white shadow-[0_10px_24px_-8px_rgba(12,80,52,0.7)]">
        <Truck className="size-5" strokeWidth={1.8} />
      </div>
      <div className={`absolute top-21.5 left-5 flex items-center gap-2 rounded-callout border border-line bg-surface px-3.5 py-2.5 ${float}`}>
        <span className="size-2 rounded-full bg-success" />
        <span className="text-label">{a.passing}</span>
      </div>
      <div className={`absolute right-5.5 bottom-18 rounded-callout bg-green-900 px-3.5 py-2.5 text-white ${floatDeep}`}>
        <div className="text-micro font-medium text-green-300">{a.arrives}</div>
        <div className="text-body font-semibold">{a.arrivesAt}</div>
      </div>
    </>
  );
}

/** P02: the box with a trip on the road and the money held, in a 390 × 372 box. */
export function WelcomeArt() {
  return (
    <div aria-hidden className="relative mx-auto flex h-93 w-full max-w-97.5 items-center justify-center">
      <div className="absolute size-70 rounded-full bg-green-100/70" />
      <Image src="/art/box.webp" alt="" width={176} height={140} priority className="relative mt-6 w-44 drop-shadow-[0_26px_26px_rgba(15,26,20,0.16)]" />
      <div className="absolute top-11.5 left-5 w-50 rounded-tile border border-line-soft bg-surface p-3.5 shadow-[0_24px_48px_-24px_rgba(15,26,20,0.35)]">
        <div className="flex items-center justify-between">
          <span className="text-micro tracking-kv text-ink-3">{a.ref}</span>
          <span className="rounded-pill bg-info-100 px-2 py-0.75 text-micro text-info">{a.onRoad}</span>
        </div>
        <div className="mt-2 text-body font-semibold tracking-[-0.015em]">{a.route}</div>
        <div className="relative mt-2.5 h-1 rounded-pill bg-line">
          <span className="absolute inset-y-0 left-0 w-[62%] rounded-pill bg-green-700" />
        </div>
        <div className="mt-1.75 text-micro font-medium text-ink-3">{a.passingArrives}</div>
      </div>
      <div className="absolute right-4.5 bottom-13 w-49 rounded-tile bg-green-900 p-3.5 text-white shadow-[0_24px_48px_-22px_rgba(8,56,38,0.55)]">
        <div className="flex items-center gap-1.5 text-micro text-green-300">
          <Lock className="size-3.5" strokeWidth={1.8} />
          {a.held}
        </div>
        <div className="tabular mt-1.5 text-title-2 tracking-[-0.03em]">{a.amount}</div>
        <div className="mt-1 text-micro font-medium text-white/72">{a.paidAs}</div>
      </div>
    </div>
  );
}
