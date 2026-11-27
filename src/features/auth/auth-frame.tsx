import { Box, ChevronLeft, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

const f = messages.auth.frame;
const art = f.art;

/** The pale city behind the van (mockup D01). */
function City() {
  return (
    <svg aria-hidden viewBox="0 0 700 360" preserveAspectRatio="xMidYMax meet" className="absolute inset-x-0 bottom-62.5 h-90 w-full">
      <g className="fill-green-100">
        <rect x="60" y="150" width="46" height="210" />
        <rect x="112" y="90" width="38" height="270" />
        <rect x="156" y="190" width="54" height="170" />
        <rect x="420" y="120" width="44" height="240" />
        <rect x="470" y="40" width="34" height="320" />
        <rect x="482" y="10" width="10" height="34" />
        <rect x="510" y="160" width="58" height="200" />
        <rect x="574" y="110" width="40" height="250" />
        <rect x="250" y="210" width="40" height="150" />
        <rect x="620" y="200" width="50" height="160" />
      </g>
      <g className="fill-white">
        <ellipse cx="170" cy="70" rx="44" ry="18" />
        <ellipse cx="196" cy="58" rx="28" ry="20" />
        <ellipse cx="560" cy="96" rx="40" ry="16" />
        <ellipse cx="584" cy="86" rx="24" ry="18" />
      </g>
    </svg>
  );
}

function Feature({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-700 text-white">{icon}</span>
      <span className="min-w-0">
        <span className="block text-body font-semibold">{title}</span>
        <span className="block text-caption text-ink-3">{sub}</span>
      </span>
    </div>
  );
}

/** D01's left half: the courier and the van on a pale green panel, a live trip card, two promises. */
export function AuthArt() {
  return (
    <aside className="relative m-4 hidden basis-[52%] flex-col overflow-hidden rounded-hero bg-green-50 px-12 py-10 lg:flex">
      <Logo variant="primary-green" className="relative z-10 h-8.5 w-auto self-start" priority />
      <City />
      <Image src="/art/van.webp" alt="" width={560} height={290} priority className="absolute right-[-30px] bottom-50 w-140 drop-shadow-[0_30px_30px_rgba(15,26,20,0.18)]" />
      <Image
        src="/art/courier-placeholder.webp"
        alt={art.alt}
        width={300}
        height={477}
        priority
        className="absolute bottom-37.5 left-17.5 z-10 w-75 drop-shadow-[0_30px_30px_rgba(15,26,20,0.2)]"
      />
      <div aria-hidden className="absolute top-30 right-10 z-20 w-62.5 rounded-card border border-line bg-surface px-4 py-3.5 shadow-[0_30px_60px_-30px_rgba(15,26,20,0.45)]">
        <div className="flex items-center justify-between text-caption font-semibold">
          <span className="tracking-caps text-ink-3">{art.ref}</span>
          <span className="text-info">{art.status}</span>
        </div>
        <div className="mt-1.5 text-title-3">{art.route}</div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-track">
          <i className="block h-full w-[62%] rounded-pill bg-green-700" />
        </div>
        <div className="mt-2 text-caption text-ink-3">{art.progress}</div>
      </div>
      <div className="absolute inset-x-12 bottom-10 z-30 flex gap-3">
        <Feature icon={<Box aria-hidden className="size-5" strokeWidth={1.8} />} title={art.easy} sub={art.easySub} />
        <Feature icon={<ShieldCheck aria-hidden className="size-5" strokeWidth={1.8} />} title={art.held} sub={art.heldSub} />
      </div>
    </aside>
  );
}

/**
 * The phone header of every sign-in step (P03–P06b): a round Back button, then the mark or "Step n of 3"
 * in the middle. From 1024 px the art panel takes over and only `desktopEnd` shows, top right.
 */
export function AuthTop({ back, middle, end, desktopEnd }: { back?: string; middle?: ReactNode; end?: ReactNode; desktopEnd?: ReactNode }) {
  return (
    <>
      <header className="flex h-14.5 items-end justify-between px-4 lg:hidden">
        {back ? (
          <Link href={back} aria-label={f.back} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink">
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
          </Link>
        ) : (
          <span className="w-11" />
        )}
        <span className="flex h-11 items-center">{middle ?? <Logo variant="icon-green" alt="" className="h-9 w-auto" />}</span>
        <span className="flex h-11 w-11 items-center justify-end">{end}</span>
      </header>
      {desktopEnd ? <div className="absolute top-10 right-14 hidden items-center gap-1 text-body-sm font-medium lg:flex">{desktopEnd}</div> : null}
    </>
  );
}

/** "Step 2 of 3" in the header. */
export function StepLabel({ n }: { n: number }) {
  return <span className="text-label text-ink-3">{f.step.replace("{n}", String(n))}</span>;
}

/** The words of a step: 24 px side padding on phones, none in the desktop column. */
export function AuthBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-6 lg:px-0", className)}>{children}</div>;
}

/** The step's buttons: docked at the bottom on phones, straight under the words from 1024 px. */
export function AuthActions({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mt-auto flex flex-col gap-4.5 px-6 pt-6 pb-[max(env(safe-area-inset-bottom),30px)] lg:mt-6 lg:px-0 lg:pt-0 lg:pb-0", className)}>{children}</div>;
}

/** "New here? Get started" (D01, top right on desktop; under the button on phones). */
export function NewHere({ href }: { href: string }) {
  return (
    <>
      <span className="text-ink-2">{f.newHere}</span>
      <Link href={href} className="font-semibold text-green-700">
        {f.getStarted}
      </Link>
    </>
  );
}
