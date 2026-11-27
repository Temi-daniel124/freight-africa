"use client";

import { Bell, ChevronLeft, ChevronRight, Clock, ShieldCheck, Star, Truck, X } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CancelButton } from "@/features/booking/trip-controls";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { acceptReply, changeDay, declineReply, keepWaiting, raisePrice, sendReoffer } from "./actions";
import { checkoutMessage } from "./screens";

// P11 Finding your truck, P11b Owners replied, P11d Offer again, P11c No truck after 24 h; D08 on desktop.
// Every amount comes from the server; the database decides what each choice may do (D047).

const f = messages.finding;
const naira = (kobo: number) => formatNaira(kobo / 100);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const go = (url: string) => window.location.assign(url);

export type Reply = {
  id: string;
  org: string;
  tier: string | null;
  truck: string;
  /** The total the owner asks for, fee included (what the sender's offer is compared with). */
  totalKobo: number;
  /** What accepting costs now: the difference and the fee on it. */
  payKobo: number;
  expiresAt: string;
  /** Offer again is once per owner (D047). */
  canOfferAgain: boolean;
};

/** free is -1 when the count isn't known (a draft finished from Trips). */
export type DayFree = { day: string; free: number };

export type FindingProps = {
  loadId: string;
  reference: string;
  route: string;
  places: string;
  pickupLine: string;
  pickupShort: string;
  itemsLine: string;
  goodsLine: string;
  receiver: string | null;
  heldKobo: number;
  totalKobo: number;
  offered: boolean;
  fundedAt: string | null;
  createdAt: string;
  due: boolean;
  replies: Reply[];
  truckName: string;
  days: DayFree[];
  canCancel: boolean;
};

function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(t);
  }, [every]);
  return now;
}

const minutesText = (ms: number) => {
  const min = Math.max(1, Math.floor(ms / 60000));
  return min < 60 ? fill(f.minutes, { n: min }) : fill(f.hours, { h: Math.floor(min / 60), m: min % 60 });
};

const dayName = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "Africa/Lagos" }).format(new Date(`${day}T12:00:00+01:00`)).replace(",", "");

/** Mockup: two rings pulse outward every 2.4 s behind the truck (still with reduced motion). */
function Pulse() {
  const reduce = useReducedMotion();
  return (
    <span className="relative grid size-26 place-items-center">
      {[0, 1.2].map((delay) => (
        <m.span
          key={delay}
          aria-hidden
          className="absolute inset-0 rounded-full bg-green-700/20"
          initial={{ scale: 1, opacity: reduce ? 0.6 : 0.7 }}
          animate={reduce ? undefined : { scale: 1.6, opacity: 0 }}
          transition={reduce ? undefined : { duration: 2.4, delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <span className="relative grid size-21 place-items-center rounded-full bg-green-700 text-white">
        <Truck aria-hidden className="size-8" strokeWidth={1.8} />
      </span>
    </span>
  );
}

function HeldCard({ amount, note }: { amount: number; note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-tile bg-green-50 px-4.5 py-4">
      <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" strokeWidth={1.8} />
      <div>
        <p className="text-body font-semibold text-green-900">{fill(f.held, { amount: naira(amount) })}</p>
        <p className="text-meta text-green-800">{note}</p>
      </div>
    </div>
  );
}

// ---- Change the pick-up day ------------------------------------------------------------------------

const SLOTS = { morning: [6, 12], afternoon: [12, 17], evening: [17, 21], any: [6, 21] } as const;
type Slot = keyof typeof SLOTS;
const at = (day: string, hour: number) => `${day}T${String(hour).padStart(2, "0")}:00:00+01:00`;

export function DaySheet({ open, onOpenChange, loadId, days, title, then }: { open: boolean; onOpenChange: (o: boolean) => void; loadId: string; days: DayFree[]; title: string; then?: () => void }) {
  const router = useRouter();
  const [day, setDay] = useState(days.find((d) => d.free > 0)?.day ?? days[0]?.day ?? "");
  const [slot, setSlot] = useState<Slot>("morning");
  const [pending, start] = useTransition();
  const slots = messages.booking.flow.slots;
  const save = () =>
    start(async () => {
      const result = await changeDay(loadId, at(day, SLOTS[slot][0]), at(day, SLOTS[slot][1]));
      if (result.status !== "ok") return void toast.error(messages.checkout.error);
      onOpenChange(false);
      if (then) return then();
      toast(f.dayChanged);
      router.refresh();
    });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} actions={<Button className="w-full" loading={pending} disabled={!day} onClick={save}>{messages.booking.flow.next}</Button>}>
      <div className="grid grid-cols-4 gap-2">
        {days.map((d) => {
          const on = d.day === day;
          return (
            <button
              key={d.day}
              type="button"
              aria-pressed={on}
              onClick={() => setDay(d.day)}
              className={cn("flex h-19 flex-col items-center justify-center rounded-tile border text-center", on ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface", !on && d.free === 0 && "text-ink-3")}
            >
              <span className={cn("text-caption font-semibold uppercase", on ? "text-white/80" : "text-ink-2")}>{dayName(d.day).split(" ")[0]}</span>
              <span className="tabular text-title-2">{dayName(d.day).split(" ")[1]}</span>
              {d.free >= 0 ? (
                <span className={cn("text-micro font-medium", on ? "text-green-300" : d.free ? "text-green-700" : "text-ink-3")}>
                  {d.free ? fill(messages.booking.flow.free, { n: d.free }) : messages.booking.flow.full}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="radiogroup" aria-label={title} className="mt-3 grid grid-cols-4 gap-2">
        {(Object.keys(SLOTS) as Slot[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={slot === s} onClick={() => setSlot(s)} className={cn("h-10 min-w-0 rounded-pill border px-1 text-body-sm whitespace-nowrap", slot === s ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}>
            {slots[s]}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---- P11d Offer again -----------------------------------------------------------------------------

function OfferAgain({ open, onOpenChange, reply, offeredKobo, loadId }: { open: boolean; onOpenChange: (o: boolean) => void; reply: Reply; offeredKobo: number; loadId: string }) {
  const router = useRouter();
  const step = 100000;
  const low = Math.ceil((offeredKobo + 1) / step) * step;
  const high = Math.floor((reply.totalKobo - 1) / step) * step;
  const [value, setValue] = useState(Math.round((low + high) / 2 / step) * step);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const result = await sendReoffer(reply.id, value, loadId);
      if (result.status !== "ok") return void toast.error(messages.checkout.error);
      onOpenChange(false);
      toast(fill(f.sent, { org: reply.org }));
      router.refresh();
    });
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={fill(f.againTitle, { org: reply.org })}
      description={fill(f.againText, { asked: naira(reply.totalKobo), offered: naira(offeredKobo) })}
      actions={
        <>
          <Button className="w-full" loading={pending} disabled={high < low} onClick={send}>
            {fill(f.send, { amount: naira(value) })}
          </Button>
          <Button variant="tertiary" size="text" onClick={() => onOpenChange(false)}>
            {messages.checkout.back}
          </Button>
        </>
      }
    >
      <p className="tabular text-center text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">{naira(value)}</p>
      <input
        type="range"
        min={low}
        max={Math.max(high, low)}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label={fill(f.againTitle, { org: reply.org })}
        className="mt-4 w-full accent-green-700"
      />
      <div className="flex justify-between text-meta text-ink-3">
        <span className="tabular">{naira(offeredKobo)}</span>
        <span className="tabular">{naira(reply.totalKobo)}</span>
      </div>
      <p className="mt-3 text-meta text-ink-2">{fill(f.againNote, { org: reply.org, more: naira(value - offeredKobo) })}</p>
    </Sheet>
  );
}

// ---- P11b / D08 replies -----------------------------------------------------------------------------

function TierPill({ tier }: { tier: string | null }) {
  if (tier === "gold") return <span className="rounded-pill bg-[#FFF4CC] px-2.5 py-1 text-caption font-semibold text-[#8A6100]">{f.gold}</span>;
  if (tier === "new") return <span className="rounded-pill bg-paper px-2.5 py-1 text-caption font-semibold text-ink-2">{f.newOwner}</span>;
  return null;
}

function ReplyCard({ reply, first, offeredKobo, loadId }: { reply: Reply; first: boolean; offeredKobo: number; loadId: string }) {
  const router = useRouter();
  const now = useNow();
  const [again, setAgain] = useState(false);
  const [pending, start] = useTransition();
  const accept = () =>
    start(async () => {
      const result = await acceptReply(reply.id);
      if (result.status === "ok") go(result.url);
      else toast.error(checkoutMessage(result));
    });
  const decline = () =>
    start(async () => {
      await declineReply(reply.id, loadId);
      router.refresh();
    });
  const left = new Date(reply.expiresAt).getTime() - now;
  const head = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={reply.org} size={48} className={first ? "bg-green-900 text-white" : undefined} />
      <div className="min-w-0">
        <p className="flex items-center gap-2">
          <span className="truncate text-body font-semibold text-ink">{reply.org}</span>
          <TierPill tier={reply.tier} />
        </p>
        <p className="flex items-center gap-1 text-meta text-ink-3">
          <Star aria-hidden className="size-3.5 text-warning" strokeWidth={1.8} />
          {reply.truck}
        </p>
      </div>
    </div>
  );
  if (!first) {
    return (
      <li className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 lg:flex-row lg:items-center lg:gap-4 lg:px-6 lg:py-5">
        <div className="min-w-0 lg:flex-1">{head}</div>
        <div className="flex items-center justify-between gap-3">
          <span className="tabular text-title-2 text-ink">{naira(reply.totalKobo)}</span>
          <Button variant="secondary" size="sm" loading={pending} onClick={accept}>
            {fill(f.acceptShort, { amount: naira(reply.payKobo) })}
          </Button>
        </div>
      </li>
    );
  }
  return (
    <li className="rounded-card border border-line bg-surface p-4 lg:px-6 lg:py-6">
      <div className="lg:flex lg:items-start lg:justify-between">
        {head}
        <div className="mt-4 lg:mt-0 lg:text-right">
          <p className="text-meta text-ink-3">{f.willDo}</p>
          <div className="flex items-center justify-between gap-3 lg:block">
            <p className="tabular text-title-1 text-ink">{naira(reply.totalKobo)}</p>
            {left > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-paper px-2.5 py-1 text-caption font-semibold text-ink-2 lg:hidden">
                <Clock aria-hidden className="size-3.5" strokeWidth={1.8} />
                {fill(f.left, { time: minutesText(left) })}
              </span>
            ) : null}
          </div>
          <p className="text-meta text-ink-3">
            <span className="lg:hidden">{fill(f.more, { amount: naira(reply.totalKobo - offeredKobo) })}</span>
            <span className="hidden lg:inline">
              {fill(f.moreShort, { amount: naira(reply.totalKobo - offeredKobo) })}
              {left > 0 ? ` · ${fill(f.left, { time: minutesText(left) })}` : ""}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1 lg:flex-row-reverse lg:items-center lg:gap-2">
        <Button className="w-full lg:h-12 lg:w-auto lg:px-5 lg:text-body-sm" loading={pending} onClick={accept}>
          {fill(f.accept, { amount: naira(reply.payKobo) })}
        </Button>
        <div className="grid grid-cols-2 lg:flex lg:gap-2">
          {reply.canOfferAgain ? (
            <Button variant="tertiary" size="text" className="lg:h-12 lg:rounded-button lg:border lg:border-line-field lg:px-5 lg:text-body-sm lg:text-ink" onClick={() => setAgain(true)}>
              {f.offerAgain}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="tertiary" size="text" className="text-ink-2 lg:order-first" disabled={pending} onClick={decline}>
            {f.decline}
          </Button>
        </div>
      </div>
      <OfferAgain open={again} onOpenChange={setAgain} reply={reply} offeredKobo={offeredKobo} loadId={loadId} />
    </li>
  );
}

// ---- The screen -------------------------------------------------------------------------------------

function TopBar({ pill, tone }: { pill: string; tone: "info" | "warning" }) {
  return (
    <header className="flex items-center justify-between px-4 pt-3.5 lg:hidden">
      <Link href="/app/ship/trips" aria-label={messages.checkout.close} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink">
        <X aria-hidden className="size-5" strokeWidth={1.8} />
      </Link>
      <span className={cn("rounded-pill px-3 py-1.5 text-caption font-semibold", tone === "info" ? "bg-info-100 text-info" : "bg-warning-100 text-warning")}>{pill}</span>
    </header>
  );
}

export function FindingView(p: FindingProps) {
  const router = useRouter();
  const now = useNow();
  const [daySheet, setDaySheet] = useState(false);
  const [pending, start] = useTransition();
  const since = new Date(p.fundedAt ?? p.createdAt).getTime();
  const replies = p.replies;
  const offeredKobo = p.totalKobo;
  const nextFree = p.days.find((d) => d.free > 0);
  const raise = (bps: number) =>
    start(async () => {
      const total = Math.ceil((p.totalKobo * (10000 + bps)) / 10000 / 100000) * 100000;
      const result = await raisePrice(p.loadId, total);
      if (result.status === "ok") go(result.url);
      else toast.error(checkoutMessage(result));
    });
  const wait = () =>
    start(async () => {
      const result = await keepWaiting(p.loadId);
      if (result.status !== "ok") return void toast.error(messages.checkout.error);
      toast(f.kept);
      router.refresh();
    });
  const cancel = p.canCancel ? <CancelButton loadId={p.loadId} atPickup={false} label={p.due ? f.refund : f.cancel} className="mx-auto text-danger" /> : null;
  const raiseBy = (bps: number) => Math.ceil((p.totalKobo * (10000 + bps)) / 10000 / 100000) * 100000 - p.totalKobo;

  let main: React.ReactNode;
  let pill: { text: string; tone: "info" | "warning" };
  if (p.due) {
    pill = { text: f.waiting24, tone: "warning" };
    const options = [
      { key: "5", title: f.raise5, sub: fill(f.raise5Text, { amount: naira(raiseBy(500)) }), best: true, run: () => raise(500) },
      { key: "10", title: f.raise10, sub: fill(f.raiseText, { amount: naira(raiseBy(1000)) }), run: () => raise(1000) },
      {
        key: "day",
        title: f.changeDayTitle,
        sub: nextFree ? fill(f.changeDayText, { day: dayName(nextFree.day), n: nextFree.free, truck: p.truckName.toLowerCase() + (nextFree.free === 1 ? "" : "s") }) : f.changeDayTextNone,
        run: () => setDaySheet(true),
      },
      { key: "wait", title: f.keepWaiting, sub: f.keepWaitingText, run: wait },
    ];
    main = (
      <div className="px-5 pt-5 lg:px-0 lg:pt-0">
        <span className="grid size-16 place-items-center rounded-tile bg-warning-100 text-warning">
          <Clock aria-hidden className="size-7" strokeWidth={1.8} />
        </span>
        <h1 className="mt-4 text-title-1 text-ink">{f.noTruck}</h1>
        <p className="mt-1.5 text-body text-ink-2">{fill(f.noTruckText, { amount: naira(p.heldKobo) })}</p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {options.map((o) => (
            <li key={o.key}>
              <button
                type="button"
                disabled={pending}
                onClick={o.run}
                className={cn("flex w-full items-center gap-3 rounded-tile border bg-surface px-4.5 py-4 text-left", o.best ? "border-2 border-green-900 bg-green-50/40" : "border-line")}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-body font-semibold text-ink">
                    {o.title}
                    {o.best ? <span className="rounded-pill bg-green-50 px-2.5 py-1 text-caption font-semibold text-green-800">{f.mostPicked}</span> : null}
                  </span>
                  <span className="block text-meta text-ink-3">{o.sub}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" strokeWidth={1.8} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (replies.length) {
    pill = { text: replies.length === 1 ? f.repliesOne : fill(f.replies, { n: replies.length }), tone: "warning" };
    main = (
      <div className="px-5 pt-5 lg:px-0 lg:pt-0">
        <h1 className="text-title-1 text-ink lg:hidden">{f.owners}</h1>
        <p className="mt-1.5 text-body text-ink-2 lg:hidden">{fill(f.offered, { amount: naira(offeredKobo) })}</p>
        <ul className="mt-5 flex flex-col gap-3 lg:mt-0">
          {replies.map((r, i) => (
            <ReplyCard key={r.id} reply={r} first={i === 0} offeredKobo={offeredKobo} loadId={p.loadId} />
          ))}
        </ul>
        <p className="mt-4 px-1 text-caption text-ink-3">
          <span className="lg:hidden">{f.nobody24}</span>
          <span className="hidden lg:inline">{f.nobody24Desk}</span>
        </p>
      </div>
    );
  } else {
    pill = { text: fill(f.pill, { time: minutesText(now - since) }), tone: "info" };
    main = (
      <div className="flex flex-col items-center px-5 pt-4 text-center lg:items-start lg:px-0 lg:pt-0 lg:text-left">
        <span className="lg:hidden">
          <Pulse />
        </span>
        <h1 className="mt-4 text-title-1 text-ink lg:hidden">{f.title}</h1>
        <p className="mt-1.5 text-body text-ink-2 lg:hidden">{fill(f.textNone, { route: p.route })}</p>
        <div className="mt-5 w-full text-left lg:hidden">
          <HeldCard amount={p.heldKobo} note={p.offered ? f.heldNoteOffer : f.heldNote} />
        </div>
        <section className="mt-3 w-full rounded-card border border-line bg-surface px-4.5 text-left lg:hidden">
          <div className="border-b border-line-soft py-4">
            <p className="text-meta text-ink-3">
              {p.reference} · {p.pickupLine}
            </p>
            <p className="text-body font-semibold text-ink">{p.places}</p>
          </div>
          <div className="border-b border-line-soft py-4">
            <p className="text-meta text-ink-3">{p.itemsLine}</p>
            <p className="text-body font-semibold text-ink">{p.goodsLine}</p>
          </div>
          <button type="button" onClick={() => setDaySheet(true)} className="flex min-h-14 w-full items-center justify-between text-body font-semibold text-green-800">
            {f.changeDay}
            <ChevronRight aria-hidden className="size-5 text-ink-2" strokeWidth={1.8} />
          </button>
        </section>
        <p className="mt-3 flex w-full items-start gap-3 rounded-tile border border-line bg-surface px-4.5 py-4 text-left text-meta text-ink lg:hidden">
          <Bell aria-hidden className="mt-0.5 size-4.5 shrink-0 text-ink-2" strokeWidth={1.8} />
          {f.notify}
        </p>
        {/* desktop: the status card in the left column */}
        <section className="hidden w-full items-center gap-6 rounded-card border border-line bg-surface p-7 lg:flex">
          <Pulse />
          <div>
            <h2 className="text-title-2 text-ink">{f.title}</h2>
            <p className="mt-1 text-body text-ink-2">{fill(f.textNone, { route: p.route })}</p>
            <p className="mt-2 text-meta text-ink-3">{f.notify}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-paper max-lg:fixed max-lg:inset-0 max-lg:z-30 max-lg:overflow-y-auto max-lg:pb-40 lg:mx-auto lg:grid lg:max-w-[1080px] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
      <TopBar pill={pill.text} tone={pill.tone} />
      <div className="min-w-0">
        {/* desktop header (D08) */}
        <div className="mb-5 hidden lg:block">
          <Link href="/app/ship/trips" className="inline-flex items-center gap-1 text-body-sm text-ink-2">
            <ChevronLeft aria-hidden className="size-4" strokeWidth={1.8} />
            {messages.shell.pages.trips.title}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-display text-ink">{p.route}</h1>
            <span className={cn("rounded-pill px-3 py-1.5 text-caption font-semibold", pill.tone === "info" ? "bg-info-100 text-info" : "bg-warning-100 text-warning")}>{pill.text}</span>
          </div>
          <p className="mt-1 text-body text-ink-2">
            {p.reference} · {p.pickupLine}
          </p>
        </div>
        {main}
      </div>
      {/* desktop right column (D08) */}
      <aside className="hidden flex-col gap-4 self-start lg:flex">
        <HeldCard amount={p.heldKobo} note={p.offered ? f.heldNoteOffer : f.heldNote} />
        <dl className="rounded-card border border-line bg-surface px-5">
          <div className="flex items-start justify-between border-b border-line-soft py-4">
            <div>
              <dt className="text-meta text-ink-3">{f.pickup}</dt>
              <dd className="text-body font-semibold text-ink">{p.pickupShort}</dd>
            </div>
            <button type="button" onClick={() => setDaySheet(true)} className="text-body-sm font-semibold text-green-700">
              {f.change}
            </button>
          </div>
          <div className="border-b border-line-soft py-4">
            <dt className="text-meta text-ink-3">{f.goods}</dt>
            <dd className="text-body font-semibold text-ink">{p.goodsLine}</dd>
          </div>
          {p.receiver ? (
            <div className="py-4">
              <dt className="text-meta text-ink-3">{f.receiver}</dt>
              <dd className="text-body font-semibold text-ink">{p.receiver}</dd>
            </div>
          ) : null}
        </dl>
        {cancel}
      </aside>
      {/* phone bottom */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-linear-to-b from-paper/0 to-paper to-[18px] px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),24px)] lg:hidden">
        {!p.due && !replies.length ? (
          <Link href={`/app/ship/trips/${p.loadId}?details=1`} className="grid h-14 place-items-center rounded-button border border-line-field bg-surface text-control font-semibold text-ink">
            {f.viewTrip}
          </Link>
        ) : null}
        {cancel}
      </div>
      <DaySheet open={daySheet} onOpenChange={setDaySheet} loadId={p.loadId} days={p.days} title={f.changeDayTitle} />
    </div>
  );
}
