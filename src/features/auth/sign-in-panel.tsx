import { Lock, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import messages from "@/messages/en.json";

const t = messages.auth;
const p = t.panel;

// The faint road line across the panel (DESIGN_SYSTEM.md 6.4): a wide soft band with a dashed centre line.
function Road() {
  const d = "M-20 380 C 180 300, 260 120, 460 150 S 760 60, 840 20";
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 420"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -inset-x-1/10 top-1/2 -z-10 h-105 -translate-y-1/2"
    >
      <path d={d} fill="none" strokeWidth="64" strokeLinecap="round" className="stroke-white/5" />
      <path d={d} fill="none" strokeWidth="2" strokeDasharray="14 12" strokeLinecap="round" className="stroke-road-yellow/28" />
    </svg>
  );
}

// A live trip, as a shipper would see it in the app. Decorative only: no real data, hidden from screen readers.
function TripCard() {
  return (
    <div className="rounded-tile bg-surface p-4.5 shadow-panel-card lg:rounded-card lg:p-6">
      <div className="mb-3.5 flex items-center justify-between lg:mb-5">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-info-100 px-3 text-caption font-semibold text-info">
          <Truck className="size-3.5" strokeWidth={1.75} />
          {p.status}
        </span>
        <span className="tabular text-caption font-semibold tracking-plate text-ink-2">{p.plate}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-body-lg leading-5.5 font-bold tracking-tight lg:text-title-2 lg:leading-6.5">
          {p.from}
          <small className="block text-caption text-ink-3">{p.fromCity}</small>
        </div>
        <div className="relative h-6 flex-1">
          <span className="absolute top-2 left-0 size-2 rounded-pill bg-green-700" />
          <span className="absolute top-2.75 left-0 h-0.5 w-7/12 rounded-pill bg-green-700" />
          <svg className="absolute top-2.75 right-0 h-0.5 w-5/12" preserveAspectRatio="none">
            <line x1="0" y1="1" x2="100%" y2="1" strokeWidth="2" strokeDasharray="8 6" className="stroke-line-strong" />
          </svg>
          <span className="absolute top-1.75 right-0 size-2.5 rounded-pill border-2 border-line-strong bg-surface" />
          <span className="absolute top-0 left-7/12 grid h-6 w-7 -translate-x-1/2 place-items-center rounded-pill bg-green-700 text-white">
            <Truck className="size-4" strokeWidth={2} />
          </span>
        </div>
        <div className="text-right text-body-lg leading-5.5 font-bold tracking-tight lg:text-title-2 lg:leading-6.5">
          {p.to}
          <small className="block text-caption text-ink-3">{p.toCity}</small>
        </div>
      </div>
      <div className="mt-5 hidden items-center justify-between border-t border-line pt-4 lg:flex">
        <div className="flex items-center gap-2.5 text-body-sm leading-4.75">
          <span className="grid size-8 place-items-center rounded-pill bg-green-100 text-caption font-bold text-green-700">{p.initials}</span>
          <div>
            {p.owner}
            <span className="flex h-4.75 items-center gap-1 text-caption font-semibold text-green-700">
              <ShieldCheck className="size-3.5" strokeWidth={1.75} />
              {p.verified}
            </span>
          </div>
        </div>
        <div className="tabular text-right text-caption leading-4.75 font-medium text-ink-2">
          {p.expected}
          <b className="block text-body-sm leading-4.5 font-bold text-ink">{p.eta}</b>
        </div>
      </div>
    </div>
  );
}

// Where the money is: held, part on the way, final after delivery (D031: stages, never amounts).
function MoneyCard() {
  return (
    <div className="relative mt-4 -mr-8 ml-auto hidden w-72 rounded-tile bg-surface px-4.5 py-4 shadow-panel-card lg:block">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-nav bg-green-700 text-white">
          <Lock className="size-5" strokeWidth={1.75} />
        </span>
        <div>
          <div className="text-body-sm font-bold">{p.held}</div>
          <div className="text-caption leading-4 text-ink-2">{p.released}</div>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-1.5">
        <i className="h-1 rounded-pill bg-green-700" />
        <i className="h-1 rounded-pill bg-linear-to-r from-green-700 from-50% to-line to-50%" />
        <i className="h-1 rounded-pill bg-line" />
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-micro text-ink-3">
        <span className="text-green-700">{p.steps[0]}</span>
        <span className="text-green-700">{p.steps[1]}</span>
        <span>{p.steps[2]}</span>
      </div>
    </div>
  );
}

/**
 * The deep-green side of the sign-in pages (Gate 1 target). Desktop: logo, the trip and payment cards,
 * the approved line. Phone and tablet: a band with the logo and the trip card only.
 */
export function SignInPanel({ homeHref }: { homeHref: string }) {
  return (
    <aside className="relative isolate h-74 shrink-0 overflow-hidden bg-green-900 px-5 pt-5 lg:flex lg:h-auto lg:flex-col lg:justify-between lg:rounded-sheet lg:p-10 lg:short:p-6">
      <div aria-hidden className="panel-glow absolute inset-0 -z-20" />
      <Road />
      <a href={homeHref} aria-label={messages.site.homeLabel} className="block self-start rounded-button">
        <Logo variant="primary-white" alt="" className="h-8 lg:h-10" priority />
      </a>

      <div aria-hidden className="absolute inset-x-5 top-18 lg:relative lg:inset-auto lg:my-6 lg:w-full lg:max-w-110 lg:self-center lg:short:my-3">
        <TripCard />
        <MoneyCard />
      </div>

      <p className="hidden max-w-100 text-title-2 leading-7 text-white lg:block">
        {t.photoLine}
        <span className="mt-2 block text-body font-medium text-white/72">{t.photoSub}</span>
      </p>
    </aside>
  );
}
