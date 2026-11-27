"use client";

import { Check, ChevronLeft, ExternalLink, Lock, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { SuccessCheck } from "@/components/ui/motion";
import { Sheet } from "@/components/ui/sheet";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { type CheckoutResult, checkoutState, finishDemoCheckout, saveAsDraft, startBatchCheckout, startCheckout } from "./actions";

const c = messages.checkout;
const naira = (kobo: number) => formatNaira(kobo / 100);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** What a refused checkout says (one plain sentence, ux-conventions). */
export function checkoutMessage(result: CheckoutResult) {
  if (result.status === "noProvider") return c.noProvider;
  if (result.status === "day") return c.dayPassed;
  if (result.status === "offer") return c.offerChanged;
  return c.error;
}

/** Off to the provider's page (D048): same tab, like Paystack. */
function go(url: string) {
  window.location.assign(url);
}

// ---- Shared frame -----------------------------------------------------------------------------------

function PhoneHeader({ title, back, icon = "back" }: { title?: string; back: string; icon?: "back" | "none" }) {
  return (
    <header className="flex items-center gap-3 px-4 pt-3.5 lg:hidden">
      {icon === "back" ? (
        <Link href={back} aria-label={c.back} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
      ) : null}
      {title ? <h1 className="text-title-2 text-ink">{title}</h1> : null}
    </header>
  );
}

/** D04 / D04c: no sidebar; a white top bar with Back, the logo and "Secure payment". */
function DeskBar({ back }: { back?: string }) {
  return (
    <header className="hidden h-18 items-center gap-4 border-b border-line bg-surface px-10 lg:flex">
      {back ? (
        <Link href={back} aria-label={c.back} className="grid size-10 place-items-center rounded-full border border-line text-ink">
          <ChevronLeft aria-hidden className="size-4.5" strokeWidth={1.8} />
        </Link>
      ) : null}
      <Logo className="h-6 w-auto" />
      <span className="ml-auto inline-flex items-center gap-2 text-body-sm text-ink-2">
        <Lock aria-hidden className="size-4" strokeWidth={1.8} />
        {c.securePayment}
      </span>
    </header>
  );
}

/** The bottom of a phone screen: the one primary action and a text link under it (mockup .bar). */
function PhoneBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col bg-linear-to-b from-paper/0 to-paper to-[18px] px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),30px)] lg:hidden">
      {children}
    </div>
  );
}

// ---- P10d / D04b Saved to your drafts -----------------------------------------------------------------

export function DraftSaved({ open, onOpenChange, line }: { open: boolean; onOpenChange: (open: boolean) => void; line: string }) {
  const router = useRouter();
  return (
    <Sheet
      kind="confirm"
      open={open}
      onOpenChange={onOpenChange}
      title={c.draftSaved}
      actions={
        <>
          <Button variant="secondary" className="lg:min-w-32" onClick={() => router.push("/app/ship")}>
            {c.done}
          </Button>
          <Button className="lg:min-w-44" onClick={() => router.push("/app/ship/trips?tab=drafts")}>
            {c.viewDrafts}
          </Button>
        </>
      }
    >
      <div className="-mt-12 flex flex-col items-center text-center">
        <SuccessCheck label={c.draftSaved} className="order-first mb-16" />
      </div>
      <p className="-mt-3 text-center text-body-sm text-ink-2">{line}</p>
      <div className="mt-2 rounded-callout bg-warning-100 px-4 py-3.5 text-left">
        <p className="text-body-sm font-semibold text-ink">{c.notPlaced}</p>
        <p className="mt-0.5 text-meta text-ink-2">{c.notPlacedText}</p>
      </div>
    </Sheet>
  );
}

// ---- P10 / D04 Pay -------------------------------------------------------------------------------------

export type PayProps = {
  loadId: string;
  ref: string;
  route: string;
  summary: string;
  draftLine: string;
  amountKobo: number;
  freightKobo: number;
  feeKobo: number;
  back: string;
};

function HowItGoes({ desk }: { desk?: boolean }) {
  const rows = [
    { icon: ExternalLink, text: desk ? c.opensDesk : c.opens },
    { icon: RefreshCw, text: c.comeBack },
    { icon: ShieldCheck, text: c.hold },
  ];
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
            <Icon aria-hidden className="size-4.5" strokeWidth={1.8} />
          </span>
          <span className="text-meta text-ink">{text}</span>
        </li>
      ))}
    </ul>
  );
}

function AmountBlock({ amountKobo, sub }: { amountKobo: number; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid size-21 place-items-center rounded-[28px] bg-green-900 shadow-[0_24px_40px_-22px_rgba(8,56,38,0.8)] lg:size-20 lg:rounded-[24px]">
        <Lock aria-hidden className="size-9.5 text-green-300" strokeWidth={1.8} />
      </span>
      <p className="mt-5.5 text-meta text-ink-3">{c.amountToPay}</p>
      <p className="tabular text-[42px] leading-tight font-semibold tracking-[-0.045em] text-ink lg:text-[48px]">{naira(amountKobo)}</p>
      <p className="text-meta text-ink-3">{sub}</p>
    </div>
  );
}

export function PayScreen(p: PayProps) {
  const [pending, start] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [saved, setSaved] = useState(false);
  const pay = () =>
    start(async () => {
      const result = await startCheckout(p.loadId);
      if (result.status === "ok") go(result.url);
      else toast.error(checkoutMessage(result));
    });
  const draft = () =>
    startDraft(async () => {
      const result = await saveAsDraft(p.loadId);
      if (result.status === "ok") setSaved(true);
      else toast.error(c.error);
    });
  const sub = `${p.route} · ${p.ref}`;
  const continueButton = (
    <Button className="w-full" loading={pending} loadingText loadingLabel={c.continuing} onClick={pay}>
      {c.continue}
      <ExternalLink aria-hidden strokeWidth={1.8} className="size-4.5!" />
    </Button>
  );
  const draftButton = (
    <Button variant="tertiary" size="text" className="mx-auto" loading={drafting} onClick={draft}>
      {c.saveInstead}
    </Button>
  );
  return (
    <div className="min-h-dvh bg-paper">
      <PhoneHeader title={c.pay} back={p.back} />
      <DeskBar back={p.back} />
      {/* phone */}
      <div className="pb-40 lg:hidden">
        <div className="px-7 pt-8.5">
          <AmountBlock amountKobo={p.amountKobo} sub={sub} />
        </div>
        <div className="px-5 pt-6.5">
          <section className="rounded-card border border-line bg-surface p-4.5">
            <h2 className="text-body font-semibold text-ink">{c.finishOn}</h2>
            <div className="mt-3.5">
              <HowItGoes />
            </div>
          </section>
        </div>
        <PhoneBar>
          {continueButton}
          {draftButton}
        </PhoneBar>
      </div>
      {/* desktop */}
      <div className="mx-auto hidden max-w-[968px] grid-cols-[560px_380px] gap-7 pt-14 pb-14 lg:grid">
        <section className="flex flex-col gap-7 rounded-card border border-line bg-surface px-9 pt-9 pb-12">
          <AmountBlock amountKobo={p.amountKobo} sub={sub} />
          <HowItGoes desk />
          <div className="flex flex-col gap-2">
            {continueButton}
            {draftButton}
          </div>
        </section>
        <aside className="self-start rounded-card bg-green-900 p-6 text-white">
          <p className="text-caption font-semibold tracking-caps text-green-300 uppercase">{c.orderSummary}</p>
          <p className="mt-2 text-title-2 text-white">{p.route}</p>
          <p className="mt-1 text-body-sm text-white/70">{p.summary}</p>
          <dl className="mt-4 border-t border-white/15 pt-3 text-body-sm">
            <div className="flex justify-between py-1.5">
              <dt className="text-white/70">{c.freight}</dt>
              <dd className="tabular">{naira(p.freightKobo)}</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-white/70">{c.fee}</dt>
              <dd className="tabular">{p.feeKobo ? naira(p.feeKobo) : c.free}</dd>
            </div>
            <div className="mt-1.5 flex justify-between border-t border-white/15 pt-3 text-body font-semibold">
              <dt>{c.total}</dt>
              <dd className="tabular">{naira(p.amountKobo)}</dd>
            </div>
          </dl>
          <p className="mt-6 text-caption font-semibold tracking-caps text-green-300 uppercase">{c.howMoney}</p>
          <ol className="mt-3 flex flex-col gap-3">
            {[c.money1, c.money2, c.money3].map((text, i) => (
              <li key={text} className="flex items-start gap-3 text-body-sm">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-white/10 text-caption text-green-300">{i + 1}</span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <DraftSaved open={saved} onOpenChange={setSaved} line={p.draftLine} />
    </div>
  );
}

// ---- P10b / D04c Confirming, P10c Failed --------------------------------------------------------------

export type ReturnProps = {
  kind: "payment" | "batch";
  id: string;
  ref: string;
  amountKobo: number;
  route: string;
  loadId: string | null;
  /** Only a booking's own payment can be tried again from here; a top-up or a raise goes back to its trip. */
  retryable: boolean;
  draftLine: string;
  initial: "pending" | "paid" | "failed";
};

function Spinner() {
  return (
    <span aria-hidden className="block size-22 rounded-full border-[6px] border-line border-b-green-700 motion-safe:animate-spin motion-safe:[animation-duration:1s] lg:size-21" />
  );
}

export function ReturnScreen(p: ReturnProps) {
  const router = useRouter();
  const [state, setState] = useState(p.initial);
  const [pending, start] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [saved, setSaved] = useState(false);
  const next = p.loadId ? `/app/ship/trips/${p.loadId}` : "/app/ship/trips";

  useEffect(() => {
    if (state === "paid") router.replace(next);
    if (state !== "pending") return;
    let stop = false;
    const tick = async () => {
      const s = await checkoutState(p.kind, p.id).catch(() => null);
      if (!stop && s && s.state !== "pending") setState(s.state);
    };
    const timer = window.setInterval(tick, 2000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [state, p.kind, p.id, router, next]);

  if (state === "failed") {
    const retry = () =>
      start(async () => {
        if (!p.retryable || !p.loadId) return router.replace(next);
        const result = await startCheckout(p.loadId);
        if (result.status === "ok") go(result.url);
        else toast.error(checkoutMessage(result));
      });
    const draft = () =>
      startDraft(async () => {
        if (!p.loadId) return;
        const result = await saveAsDraft(p.loadId);
        if (result.status === "ok") setSaved(true);
        else toast.error(c.error);
      });
    return (
      <div className="min-h-dvh bg-paper">
        <PhoneHeader back={next} />
        <DeskBar back={next} />
        <div className="flex flex-col items-center px-8 pt-17 pb-40 text-center lg:mx-auto lg:mt-20 lg:max-w-[460px] lg:rounded-card lg:border lg:border-line lg:bg-surface lg:px-10 lg:pt-12 lg:pb-10">
          <span className="grid size-24 place-items-center rounded-[28px] bg-danger-100 text-danger">
            <TriangleAlert aria-hidden className="size-9" strokeWidth={1.8} />
          </span>
          <h1 className="mt-6 text-title-1 text-ink">{c.failed}</h1>
          <p className="mt-2 text-body text-ink-2">{c.failedText}</p>
          <div className="mt-6 flex w-full items-center justify-between rounded-tile border border-line bg-surface px-4 py-3.5 lg:bg-paper">
            <span className="text-meta text-ink-2">{p.route}</span>
            <span className="tabular text-body font-semibold text-ink">{naira(p.amountKobo)}</span>
          </div>
          <div className="mt-8 hidden w-full flex-col gap-2 lg:flex">
            <Button className="w-full" loading={pending} onClick={retry}>
              {c.tryAgain}
            </Button>
            {p.retryable ? (
              <Button variant="tertiary" size="text" loading={drafting} onClick={draft}>
                {c.saveDraft}
              </Button>
            ) : null}
          </div>
        </div>
        <PhoneBar>
          <Button className="w-full" loading={pending} onClick={retry}>
            {c.tryAgain}
          </Button>
          {p.retryable ? (
            <Button variant="tertiary" size="text" className="mx-auto" loading={drafting} onClick={draft}>
              {c.saveDraft}
            </Button>
          ) : null}
        </PhoneBar>
        <DraftSaved open={saved} onOpenChange={setSaved} line={p.draftLine} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="hidden h-24 items-center px-10 lg:flex">
        <Logo className="h-7.5 w-auto" />
      </header>
      <div role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center px-11 pt-50 text-center lg:mx-auto lg:min-h-0 lg:max-w-[460px] lg:rounded-card lg:border lg:border-line lg:bg-surface lg:px-10 lg:pt-12 lg:pb-12">
        <Spinner />
        <h1 className="mt-6 text-title-2 text-ink">{c.confirming}</h1>
        <p className="mt-1.5 text-body text-ink-2">
          <span className="lg:hidden">{c.confirmingText}</span>
          <span className="hidden lg:inline">{c.confirmingTextDesk}</span>
        </p>
        <p className="mt-6 inline-flex items-center gap-4 rounded-pill border border-line bg-surface px-5 py-3.5 lg:border-0 lg:py-0">
          <span className="tabular text-body-sm text-ink-3">{p.ref}</span>
          <span className="tabular text-body font-semibold text-ink">{naira(p.amountKobo)}</span>
        </p>
        <p className="mt-auto pb-10 text-caption text-ink-3 lg:mt-6 lg:pb-0">
          <span className="lg:hidden">{c.tooLong}</span>
          <span className="hidden lg:inline">{c.tooLongDesk}</span>
        </p>
      </div>
    </div>
  );
}

// ---- The demo checkout (D039, D048): our own page, clearly a demo, never drawn like Bachs ---------------

export function DemoCheckout({ providerRef, amountKobo, back }: { providerRef: string; amountKobo: number; back: string }) {
  const [pending, start] = useTransition();
  const finish = (outcome: "pay" | "fail") =>
    start(async () => {
      const result = await finishDemoCheckout(providerRef, outcome);
      if (result.status === "ok") go(back);
      else toast.error(c.error);
    });
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5">
      <section className="w-full max-w-[420px] rounded-card border-2 border-dashed border-warning/50 bg-surface p-7 text-center">
        <p className="mx-auto inline-flex rounded-pill bg-warning-100 px-3 py-1.5 text-caption font-semibold text-warning">{c.demoBadge}</p>
        <h1 className="mt-4 text-title-2 text-ink">{c.demoTitle}</h1>
        <p className="mt-1.5 text-body-sm text-ink-2">{c.demoText}</p>
        <p className="tabular mt-5 text-title-1 text-ink">{naira(amountKobo)}</p>
        <p className="tabular text-caption text-ink-3">{fill(c.demoFor, { ref: providerRef })}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" loading={pending} onClick={() => finish("pay")}>
            <Check aria-hidden strokeWidth={2} />
            {fill(c.demoPay, { amount: naira(amountKobo) })}
          </Button>
          <Button variant="danger" className="w-full" disabled={pending} onClick={() => finish("fail")}>
            {c.demoFail}
          </Button>
        </div>
      </section>
    </div>
  );
}

// ---- P15c Pay for several ---------------------------------------------------------------------------

export type SeveralDraft = { id: string; route: string; line: string; totalKobo: number };

export function PaySeveral({ drafts }: { drafts: SeveralDraft[] }) {
  const [picked, setPicked] = useState<string[]>(() => drafts.slice(0, 2).map((d) => d.id));
  const [pending, start] = useTransition();
  const total = useMemo(() => drafts.filter((d) => picked.includes(d.id)).reduce((sum, d) => sum + d.totalKobo, 0), [drafts, picked]);
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const pay = () =>
    start(async () => {
      const result = await startBatchCheckout(picked);
      if (result.status === "ok") go(result.url);
      else toast.error(checkoutMessage(result));
    });
  return (
    <div className="min-h-dvh bg-paper pb-48 lg:pb-14">
      <header className="flex items-center gap-3 px-4 pt-3.5 lg:mx-auto lg:max-w-[560px] lg:px-0 lg:pt-10">
        <Link href="/app/ship/trips?tab=drafts" aria-label={c.back} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
        <h1 className="text-title-2 text-ink">{c.several}</h1>
      </header>
      <div className="px-5 lg:mx-auto lg:max-w-[560px] lg:px-0">
        <p className="mt-4 text-body-sm text-ink-2">{c.severalLead}</p>
        {drafts.length < 2 ? (
          <p className="mt-4 rounded-callout bg-surface px-4 py-3.5 text-body-sm text-ink-2">{c.severalEmpty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface px-4">
            {drafts.map((d) => {
              const on = picked.includes(d.id);
              return (
                <li key={d.id}>
                  <label className="flex min-h-17 cursor-pointer items-center gap-3.5 py-3.5">
                    <input type="checkbox" checked={on} onChange={() => toggle(d.id)} className="peer sr-only" />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-check border peer-focus-visible:shadow-focus",
                        on ? "border-green-700 bg-green-700 text-white" : "border-line-field bg-surface",
                      )}
                    >
                      {on ? <Check className="size-3.5" strokeWidth={2.6} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-ink">{d.route}</span>
                      <span className="block truncate text-meta text-ink-3">{d.line}</span>
                    </span>
                    <span className="tabular shrink-0 text-body font-semibold text-ink">{naira(d.totalKobo)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3.5 rounded-callout bg-green-50 px-4 py-3.5 text-meta text-green-800">{c.severalNote}</p>
        <div className="mt-6 hidden lg:block">
          <SeveralTotal count={picked.length} total={total} />
          <Button className="mt-3 w-full" disabled={picked.length < 2} loading={pending} onClick={pay}>
            <Lock aria-hidden strokeWidth={1.8} className="size-4.5!" />
            {fill(c.demoPay, { amount: naira(total) })}
          </Button>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),24px)] lg:hidden">
        <SeveralTotal count={picked.length} total={total} />
        <Button className="mt-3 w-full" disabled={picked.length < 2} loading={pending} onClick={pay}>
          <Lock aria-hidden strokeWidth={1.8} className="size-4.5!" />
          {fill(c.demoPay, { amount: naira(total) })}
        </Button>
      </div>
    </div>
  );
}

function SeveralTotal({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-meta text-ink-3">{count === 1 ? c.selectedOne : fill(c.selected, { n: count })}</span>
      <span className="tabular text-title-2 text-ink">{naira(total)}</span>
    </div>
  );
}
