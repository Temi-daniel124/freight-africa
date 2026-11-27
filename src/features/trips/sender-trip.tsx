"use client";

import { Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Copy, FileText, MapPin, Phone, RefreshCw, Share2, ShieldCheck, Star, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Box } from "@/components/art/pieces";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cancelLoad } from "@/features/booking/actions";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { cancelQuote, type CancelQuote } from "./actions";

// P14b truck confirmed, P14c delivered, D09 trip; P14e cancel sheet and the P14f 5-second undo.
// Parts whose backend is a later phase (loading code and calls: Phase 4; rating: Phase 6; problem
// reports: Phase 5) are only drawn when the view passes them, which only the /dev preview does.

const t = messages.tripPage;
const naira = (kobo: number) => formatNaira(kobo / 100);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export type Step = { title: string; sub?: string; when?: string; state: "done" | "now" | "later" };

export type TripView = {
  loadId: string;
  reference: string;
  badge: string;
  headline: string;
  subline: string;
  deskSub: string;
  delivered: boolean;
  heldKobo: number;
  heldDone: string;
  driver: { name: string; org: string; plate: string | null; truck: string; line?: string } | null;
  steps: Step[];
  stops: { place: string; who: string; pickup: boolean }[];
  receiptHref: string | null;
  bookAgainHref: string;
  canCancel: boolean;
  // Later phases: the /dev preview only.
  loadingCode?: string;
  calls?: boolean;
  photos?: number;
  rating?: boolean;
  reportUntil?: string;
};

function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="rounded-card bg-green-900 p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm text-white/80">{t.loadingCode}</p>
        <span className="rounded-pill bg-white/10 px-2.5 py-1 text-caption font-semibold text-green-300">{t.atLoading}</span>
      </div>
      <p className="tabular mt-1 text-[40px] leading-tight font-semibold tracking-[0.08em]">{code}</p>
      <p className="mt-1 text-meta text-white/80">{t.codeNote}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="inverse" size="sm" onClick={() => void navigator.clipboard?.writeText(code.replace(/\s/g, "")).then(() => setCopied(true))}>
          <Copy aria-hidden strokeWidth={1.8} />
          {copied ? t.copied : t.copy}
        </Button>
        <Button variant="secondary" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10 lg:hidden" onClick={() => void navigator.share?.({ text: code })}>
          <Share2 aria-hidden strokeWidth={1.8} />
          {t.share}
        </Button>
      </div>
    </section>
  );
}

function Held({ v }: { v: TripView }) {
  return (
    <div className="flex items-start gap-3 rounded-tile bg-green-50 px-4.5 py-4">
      <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" strokeWidth={1.8} />
      <div>
        <p className="text-body font-semibold text-green-900">{fill(t.held, { amount: naira(v.heldKobo) })}</p>
        <p className="text-meta text-green-800 lg:hidden">{t.heldNote}</p>
      </div>
    </div>
  );
}

function DriverCard({ v }: { v: TripView }) {
  if (!v.driver) return null;
  const d = v.driver;
  return (
    <section className="rounded-card border border-line bg-surface p-4.5">
      <div className="flex items-center gap-3.5">
        <Avatar name={d.name} size={52} />
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink">{d.name}</p>
          <p className="truncate text-meta text-ink-3">{fill(t.driverFor, { org: d.org })}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-inner bg-paper px-3.5 py-2.5">
          <p className="text-caption text-ink-3">{t.plate}</p>
          <p className="tabular text-body font-semibold tracking-[0.04em] text-ink">{d.plate ?? "—"}</p>
        </div>
        <div className="rounded-inner bg-paper px-3.5 py-2.5">
          <p className="text-caption text-ink-3">{t.truck}</p>
          <p className="truncate text-body font-semibold text-ink">{d.truck}</p>
        </div>
      </div>
      {d.line ? (
        <p className="mt-3 flex items-center gap-1.5 text-meta text-ink-3">
          <Star aria-hidden className="size-3.5 text-warning" strokeWidth={1.8} />
          {d.line}
        </p>
      ) : null}
      {v.calls ? (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button size="md">
            <Phone aria-hidden strokeWidth={1.8} />
            {t.callDriver}
          </Button>
          <Button size="md" variant="secondary">
            {t.callOwner}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4.5 lg:p-6">
      {steps.map((s) => (
        <li key={s.title} className="flex items-start gap-3 py-1.5">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
              s.state === "done" ? "bg-green-700 text-white" : s.state === "now" ? "border-2 border-green-700" : "border-2 border-line",
            )}
          >
            {s.state === "done" ? <Check className="size-3.5" strokeWidth={2.6} /> : null}
          </span>
          <div className="min-w-0 flex-1 lg:flex lg:items-baseline lg:justify-between lg:gap-4">
            <p className={cn("text-body", s.state === "later" ? "text-ink-3" : "font-semibold text-ink")}>{s.title}</p>
            {s.sub || s.when ? <p className="text-meta text-ink-3 lg:shrink-0">{s.when ?? s.sub}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Stops({ v }: { v: TripView }) {
  return (
    <ul className="rounded-card border border-line bg-surface px-4.5">
      {v.stops.map((s, i) => (
        <li key={i} className="flex items-start gap-3.5 border-t border-line-soft py-4 first:border-t-0">
          {s.pickup ? <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-green-700" /> : <MapPin aria-hidden className="mt-0.5 size-4.5 shrink-0 text-warning" strokeWidth={1.8} />}
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">{s.place}</p>
            <p className="text-meta text-ink-3">{s.who}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** P14e then P14f: the sheet says what comes back; confirming starts a 5 s undo before anything is cancelled. */
export function CancelTrip({ loadId, label, className, preview }: { loadId: string; label: string; className?: string; /** /dev only: open on this quote. */ preview?: CancelQuote }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!preview);
  const [quote, setQuote] = useState<CancelQuote | null>(preview ?? null);
  const [pending, start] = useTransition();
  const openSheet = () =>
    start(async () => {
      const q = await cancelQuote(loadId);
      if (!q) return void toast.error(messages.checkout.error);
      if (!q.allowed) return void toast(t.notAllowed);
      setQuote(q);
      setOpen(true);
    });
  const confirm = () => {
    setOpen(false);
    let undone = false;
    const timer = window.setTimeout(async () => {
      if (undone) return;
      const result = await cancelLoad(loadId, "");
      if (result.status === "error" || result.status === "afterLoading") toast.error(result.status === "afterLoading" ? t.notAllowed : messages.checkout.error);
      router.refresh();
    }, 5000);
    toast(t.cancelled, {
      duration: 5000,
      action: {
        label: t.undo,
        onClick: () => {
          undone = true;
          window.clearTimeout(timer);
          toast(t.undone);
        },
      },
    });
    router.push("/app/ship/trips");
  };
  const text = !quote ? "" : quote.ownerFeeKobo > 0 ? fill(t.cancelFee, { fee: naira(quote.ownerFeeKobo) }) : quote.status === "matched" ? t.cancelAssigned : t.cancelFree;
  return (
    <>
      <Button variant="tertiary" size="text" className={cn("text-danger", className)} loading={pending} onClick={openSheet}>
        {label}
      </Button>
      <Sheet
        kind="confirm"
        open={open}
        onOpenChange={setOpen}
        title={t.cancelTitle}
        description={text}
        actions={
          <>
            <Button variant="destructive" onClick={confirm}>
              {t.cancelYes}
            </Button>
            <Button variant="tertiary" size="text" className="text-ink" onClick={() => setOpen(false)}>
              {t.keep}
            </Button>
          </>
        }
      >
        {quote && quote.refundKobo > 0 ? (
          <div className="rounded-tile border border-line bg-surface px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-meta whitespace-nowrap text-ink-2">{t.refundTo}</span>
              <span className="tabular text-title-3 text-ink">{naira(quote.refundKobo)}</span>
            </div>
            <p className="mt-1 text-meta text-ink-3">{t.refundTime}</p>
          </div>
        ) : (
          <p className="text-body-sm text-ink-2">{t.noRefund}</p>
        )}
        {quote && quote.ownerFeeKobo === 0 ? <p className="mt-2 text-meta text-ink-3">{t.cancelNote}</p> : null}
      </Sheet>
    </>
  );
}

function Rating() {
  const [stars, setStars] = useState(4);
  const [tags, setTags] = useState<string[]>([t.tags[0], t.tags[1]]);
  return (
    <section className="rounded-card border border-line bg-surface p-5 text-center">
      <h2 className="text-lead font-semibold text-ink">{t.rateTitle}</h2>
      <div className="mt-3 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n}`} onClick={() => setStars(n)}>
            <Star aria-hidden className={cn("size-8", n <= stars ? "fill-[#E8A24D] text-[#E8A24D]" : "text-line-strong")} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {t.tags.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button key={tag} type="button" aria-pressed={on} onClick={() => setTags((l) => (on ? l.filter((x) => x !== tag) : [...l, tag]))} className={cn("h-11 rounded-pill border px-4 text-body-sm font-semibold", on ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}>
              {tag}
            </button>
          );
        })}
      </div>
      <Button className="mt-5 w-full">{t.sendRating}</Button>
    </section>
  );
}

function LinkRow({ href, icon: Icon, title, sub, danger }: { href: string; icon: typeof FileText; title: string; sub?: string; danger?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3.5 border-t border-line-soft py-3.5 first:border-t-0">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon", danger ? "bg-danger-100 text-danger" : "bg-green-50 text-green-700")}>
          <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-ink">{title}</span>
          {sub ? <span className="block text-meta text-ink-3">{sub}</span> : null}
        </span>
        <ChevronRight aria-hidden className="size-5 text-ink-2" strokeWidth={1.8} />
      </Link>
    </li>
  );
}

/** D09: before loading the map is a placeholder; it turns live once loaded (the track page). */
function MapPlaceholder() {
  return (
    <div className="relative hidden h-75 overflow-hidden rounded-card bg-[#E9EAE4] lg:block">
      <svg aria-hidden viewBox="0 0 680 300" className="absolute inset-0 size-full" preserveAspectRatio="none">
        <g stroke="#fff" strokeWidth="14">
          <path d="M0 70 L680 40" />
          <path d="M0 220 L680 180" />
          <path d="M150 0 L180 300" />
          <path d="M470 0 L500 300" />
        </g>
        <path d="M60 250 Q 300 200 610 50" stroke="var(--color-green-900)" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
        <circle cx="60" cy="250" r="9" fill="#fff" stroke="var(--color-green-900)" strokeWidth="4" />
        <circle cx="610" cy="44" r="12" fill="var(--color-green-900)" />
      </svg>
      <span className="absolute top-4 left-4 rounded-pill bg-surface px-3 py-1.5 text-caption font-semibold text-ink">{t.mapSoon}</span>
    </div>
  );
}

export function SenderTrip({ v }: { v: TripView }) {
  const header = (
    <header className="flex items-center justify-between px-4 pt-3.5 lg:hidden">
      <div className="flex items-center gap-3">
        <Link href="/app/ship/trips" aria-label={messages.checkout.back} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
        <span className="tabular text-body-sm font-semibold text-ink-2">{v.reference}</span>
      </div>
      <Link href="/app/ship/help" aria-label={t.help} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink">
        <CircleHelp aria-hidden className="size-5" strokeWidth={1.8} />
      </Link>
    </header>
  );
  const title = (
    <div>
      <span className={cn("inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-caption font-semibold", v.delivered ? "bg-green-50 text-green-800" : "bg-green-50 text-green-800")}>
        {v.delivered ? <Check aria-hidden className="size-3.5" strokeWidth={2.4} /> : null}
        {v.badge}
      </span>
      <h1 className="mt-2 text-title-1 text-ink lg:text-display">{v.headline}</h1>
      <p className="mt-0.5 text-meta text-ink-3 lg:hidden">{v.subline}</p>
      <p className="mt-1 hidden text-body text-ink-2 lg:block">{v.deskSub}</p>
    </div>
  );
  const cancel = v.canCancel && !v.delivered ? <CancelTrip loadId={v.loadId} label={t.cancel} className="mx-auto" /> : null;

  if (v.delivered) {
    return (
      <div data-full-screen className="min-h-dvh bg-paper lg:px-10 lg:py-8 max-lg:pb-10 lg:mx-auto lg:max-w-[720px]">
        {header}
        <div className="flex flex-col gap-3.5 px-5 pt-5 lg:px-0 lg:pt-0">
          {title}
          <section className="overflow-hidden rounded-card border border-line bg-surface">
            {v.photos ? (
              <div className="relative grid h-38 place-items-center bg-green-50">
                <svg aria-hidden viewBox="-80 -140 160 160" className="h-32">
                  <Box s={1} />
                </svg>
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-caption font-semibold text-ink">
                  <Camera aria-hidden className="size-3.5" strokeWidth={1.8} />
                  {fill(t.photos, { n: v.photos })}
                </span>
              </div>
            ) : null}
            <p className="flex items-start gap-3 px-4.5 py-4 text-body-sm text-ink">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" strokeWidth={1.8} />
              {v.heldDone}
            </p>
          </section>
          {v.rating ? <Rating /> : null}
          <ul className="rounded-card border border-line bg-surface px-4.5">
            {v.receiptHref ? <LinkRow href={v.receiptHref} icon={FileText} title={t.receipt} /> : null}
            <LinkRow href={v.bookAgainHref} icon={RefreshCw} title={t.bookAgain} sub={t.bookAgainSub} />
            {v.reportUntil ? <LinkRow href={`/app/ship/trips/${v.loadId}?report=1`} icon={TriangleAlert} title={t.report} sub={fill(t.reportOpen, { when: v.reportUntil })} danger /> : null}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div data-full-screen className="min-h-dvh bg-paper lg:px-10 lg:py-8 max-lg:pb-10 lg:mx-auto lg:grid lg:max-w-[1080px] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
      {header}
      <div className="flex min-w-0 flex-col gap-3.5 px-5 pt-5 lg:gap-5 lg:px-0 lg:pt-0">
        <Link href="/app/ship/trips" className="hidden items-center gap-1 text-body-sm text-ink-2 lg:inline-flex">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.8} />
          {messages.shell.pages.trips.title}
        </Link>
        {title}
        <div className="flex flex-col gap-3.5 lg:hidden">
          <Held v={v} />
          {v.loadingCode ? <CodeCard code={v.loadingCode} /> : null}
          <DriverCard v={v} />
        </div>
        <MapPlaceholder />
        <h2 className="mt-2 text-body font-semibold text-ink lg:hidden">{t.next}</h2>
        <div>
          <h2 className="mb-3 hidden text-lead font-semibold text-ink lg:block">{t.next}</h2>
          <Timeline steps={v.steps} />
        </div>
        <div className="flex flex-col gap-3 lg:hidden">
          <h2 className="mt-2 text-body font-semibold text-ink">{t.stops}</h2>
          <Stops v={v} />
          {v.reportUntil ? (
            <Link href={`/app/ship/trips/${v.loadId}?report=1`} className="flex min-h-12 items-center justify-center text-body font-semibold text-ink">
              {t.report}
            </Link>
          ) : null}
          {cancel}
        </div>
      </div>
      <aside className="hidden flex-col gap-4 self-start lg:flex">
        <Held v={v} />
        {v.loadingCode ? <CodeCard code={v.loadingCode} /> : null}
        <DriverCard v={v} />
        <Stops v={v} />
        <div className="flex items-center justify-between">
          {v.reportUntil ? (
            <Link href={`/app/ship/trips/${v.loadId}?report=1`} className="text-body font-semibold text-ink">
              {t.report}
            </Link>
          ) : (
            <span />
          )}
          {v.canCancel ? <CancelTrip loadId={v.loadId} label={t.cancel} /> : null}
        </div>
      </aside>
    </div>
  );
}
