"use client";

import { ChevronLeft, Info, MapPin, Package, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { takeLoad } from "@/features/booking/actions";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import type { BoardLoad } from "./load-cards";

// O13 load detail, O13b take this load (strike warning), O13d offer a different price; O13e a load with
// the sender's own price and O13f reply with your price. The database decides every amount and whether
// a reply is allowed (accept_load, counter_load: once per load, 2 hours, measured from our price).

const t = messages.ownerLoad;
const naira = (kobo: number) => formatNaira(kobo / 100);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export type LoadDetailProps = {
  load: BoardLoad & { when: string };
  tierLabel: string;
  commissionBps: number;
  advanceBps: number;
  trucks: { id: string; plate: string; type: string; capacityKg: number; busy: boolean; driverName: string | null }[];
  drivers: { id: string; name: string }[];
};

function Row({ icon, tone, label, value }: { icon: React.ReactNode; tone: string; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3.5 border-t border-line-soft py-3.5 first:border-t-0">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon", tone)}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-meta text-ink-3">{label}</span>
        <span className="block text-body font-semibold text-ink">{value}</span>
      </span>
    </li>
  );
}

export function LoadDetail({ load: l, tierLabel, commissionBps, advanceBps, trucks, drivers }: LoadDetailProps) {
  const router = useRouter();
  const fits = (x: LoadDetailProps["trucks"][number]) => x.type === l.truckType && (!l.weightKg || x.capacityKg >= l.weightKg);
  const ordered = [...trucks].sort((a, b) => Number(!fits(a) || a.busy) - Number(!fits(b) || b.busy));
  const firstFit = ordered.find((x) => fits(x) && !x.busy);
  const [truck, setTruck] = useState(firstFit?.id ?? "");
  const usual = trucks.find((x) => x.id === truck)?.driverName;
  const [driver, setDriver] = useState(drivers.find((d) => d.name === usual)?.id ?? drivers[0]?.id ?? "");
  const [confirm, setConfirm] = useState(false);
  const [offer, setOffer] = useState(false);
  const [price, setPrice] = useState("");
  const [pending, start] = useTransition();
  const commission = l.freightKobo - l.payoutKobo;
  const advance = Math.round((l.freightKobo * advanceBps) / 10000 / 100) * 100;
  const balance = l.freightKobo - commission - advance;
  const base = l.listFreightKobo;
  const low = l.offered ? base : l.freightKobo + 100000;
  const high = Math.floor((base * 1.2) / 100000) * 100000;
  const say: Record<string, string> = { taken: t.taken, heavy: t.heavy, truck: t.heavy, range: fill(t.range, { low: naira(low), high: naira(high) }), error: t.failed };

  const accept = () =>
    start(async () => {
      const r = await takeLoad(l.id, truck, driver || null);
      if (r.status !== "ok") return void toast.error(say[r.status] ?? t.failed);
      router.push(r.tripId ? `/app/haul/trips/${r.tripId}` : "/app/haul/trips");
    });
  const send = () =>
    start(async () => {
      const amount = Number(price.replace(/[^\d]/g, ""));
      const r = await takeLoad(l.id, truck, driver || null, amount);
      if (r.status !== "countered") return void toast.error(say[r.status] ?? t.failed);
      toast(t.sent);
      setOffer(false);
      router.push("/app/haul/loads");
    });
  const chosen = trucks.find((x) => x.id === truck);

  return (
    <div data-full-screen className="min-h-dvh bg-paper pb-44 lg:mx-auto lg:max-w-[720px] lg:px-10 lg:py-8 lg:pb-8">
      <header className="flex items-center gap-3 px-4 pt-3.5 lg:px-0 lg:pt-0">
        <Link href="/app/haul/loads" aria-label={messages.checkout.back} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-title-2 text-ink">
          {l.from} → {l.to}
        </h1>
        {l.offered ? <StatusChip tone="warning">{messages.owner.sendersOffer}</StatusChip> : null}
      </header>
      <div className="flex flex-col gap-3.5 px-5 pt-4 lg:px-0">
        <ul className="rounded-card border border-line bg-surface px-4.5">
          <Row icon={<MapPin aria-hidden className="size-4.5" strokeWidth={1.8} />} tone="bg-green-50 text-green-700" label={t.pickup} value={`${l.from} · ${l.when}`} />
          <Row icon={<MapPin aria-hidden className="size-4.5" strokeWidth={1.8} />} tone="bg-warning-100 text-warning" label={t.deliver} value={l.to} />
          <Row
            icon={<Package aria-hidden className="size-4.5" strokeWidth={1.8} />}
            tone="bg-[#FBEBDB] text-[#B8732E]"
            label={fill(t.goods, { band: l.band })}
            value={[l.goods, l.weightKg ? `${Math.round(l.weightKg / 1000)} t` : null, l.quantity && l.unit && l.unit !== "tonnes" ? `${l.quantity.toLocaleString("en-NG")} ${l.unit}` : null].filter(Boolean).join(" · ")}
          />
        </ul>
        <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
          <Avatar name={l.sender} size={44} />
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-ink">{l.sender}</p>
            <p className="text-meta text-ink-3">{l.senderTrips ? (l.senderTrips === 1 ? messages.owner.senderTripsOne : fill(messages.owner.senderTrips, { n: l.senderTrips })) : messages.owner.senderNew}</p>
          </div>
        </div>

        {l.offered ? (
          <section className="rounded-card border border-line bg-surface p-5">
            <p className="text-meta text-ink-3">{t.offers}</p>
            <p className="tabular text-[34px] leading-tight font-semibold tracking-[-0.04em] text-ink">{naira(l.freightKobo)}</p>
            <p className="text-caption text-ink-3">{fill(t.usualPrice, { amount: naira(l.listFreightKobo) })}</p>
            <div className="mt-3 flex items-center justify-between rounded-tile bg-green-50 px-4 py-3">
              <span className="text-body-sm text-ink-2">{fill(t.afterCommission, { pct: commissionBps / 100 })}</span>
              <span className="tabular text-title-3 text-green-900">{naira(l.payoutKobo)}</span>
            </div>
            <p className="mt-2.5 flex items-center gap-2 text-caption text-ink-3">
              <ShieldCheck aria-hidden className="size-4 text-green-700" strokeWidth={1.8} />
              {fill(t.senderPaid, { amount: naira(l.freightKobo) })}
            </p>
          </section>
        ) : (
          <section className="rounded-card bg-green-900 p-5 text-white">
            <p className="text-meta text-green-300">{t.youGet}</p>
            <p className="tabular text-[40px] leading-tight font-semibold tracking-[-0.04em]">{naira(l.payoutKobo)}</p>
            <dl className="mt-3 border-t border-white/15 pt-3 text-body-sm">
              {[
                [t.freight, naira(l.freightKobo)],
                [fill(t.commission, { tier: tierLabel, pct: commissionBps / 100 }), `−${naira(commission)}`],
                [fill(t.advance, { pct: advanceBps / 100 }), naira(advance)],
                [t.balance, naira(balance)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1">
                  <dt className="text-white/80">{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 flex items-center gap-2 text-caption text-green-300">
              <ShieldCheck aria-hidden className="size-4" strokeWidth={1.8} />
              {t.paid}
            </p>
          </section>
        )}

        <h2 className="mt-1 text-body font-semibold text-ink">{t.truck}</h2>
        <ul className="flex flex-col gap-2" role="radiogroup" aria-label={t.truck}>
          {ordered.map((x) => {
            const ok = fits(x) && !x.busy;
            const on = truck === x.id;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!ok}
                  onClick={() => (setTruck(x.id), setDriver(drivers.find((d) => d.name === x.driverName)?.id ?? driver))}
                  className={cn("flex w-full items-center gap-3.5 rounded-card border bg-surface p-4 text-left", on ? "border-2 border-green-900 bg-green-50/40" : "border-line", !ok && "opacity-55")}
                >
                  <span aria-hidden className={cn("grid size-5.5 shrink-0 place-items-center rounded-full border-2", on ? "border-green-900" : "border-line-strong")}>
                    {on ? <span className="size-2.5 rounded-full bg-green-900" /> : null}
                  </span>
                  <Truck aria-hidden className={cn("size-6 shrink-0", ok ? "text-green-900" : "text-ink-3")} strokeWidth={1.8} />
                  <span className="min-w-0">
                    <span className="tabular block text-body font-semibold text-ink">{x.plate}</span>
                    <span className="block text-meta text-ink-3">
                      {x.busy
                        ? t.onTrip
                        : x.type !== l.truckType
                          ? fill(t.needs, { type: l.truckType.toLowerCase() })
                          : l.weightKg && x.capacityKg < l.weightKg
                            ? t.tooSmall
                            : l.weightKg
                              ? fill(t.fills, { type: x.type, cap: Math.round(x.capacityKg / 1000), pct: Math.round((l.weightKg / x.capacityKg) * 100) })
                              : fill(t.fits, { type: x.type, cap: Math.round(x.capacityKg / 1000) })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {firstFit ? null : <p className="rounded-callout bg-warning-100 px-4 py-3 text-meta text-ink-2">{t.noTruck}</p>}
        <label className="flex flex-col gap-2">
          <span className="text-body font-semibold text-ink">{t.driver}</span>
          <select value={driver} onChange={(e) => setDriver(e.target.value)} className="h-14 w-full rounded-card border border-line bg-surface px-4 text-body text-ink">
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.name === usual ? ` · ${t.usual}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col border-t border-line bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),20px)] lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:px-0">
        <Button className="w-full" disabled={!truck} onClick={() => setConfirm(true)}>
          {l.offered ? fill(t.acceptOffer, { amount: naira(l.freightKobo) }) : fill(t.accept, { amount: naira(l.payoutKobo) })}
        </Button>
        {l.replied ? null : (
          <Button variant="tertiary" size="text" className="mx-auto" disabled={!truck} onClick={() => setOffer(true)}>
            {l.offered ? t.reply : t.other}
          </Button>
        )}
      </div>

      <Sheet
        kind="confirm"
        open={confirm}
        onOpenChange={setConfirm}
        title={t.takeTitle}
        actions={
          <>
            <Button loading={pending} onClick={accept}>
              {t.acceptLoad}
            </Button>
            <Button variant="tertiary" size="text" className="text-ink" onClick={() => setConfirm(false)}>
              {t.goBack}
            </Button>
          </>
        }
      >
        <div className="rounded-card border border-line p-4">
          <p className="flex items-center gap-3 text-body font-semibold text-ink">
            <Truck aria-hidden className="size-6 text-green-900" strokeWidth={1.8} />
            {chosen?.plate} · {drivers.find((d) => d.id === driver)?.name ?? ""}
          </p>
          <p className="mt-0.5 pl-9 text-meta text-ink-3">{fill(t.loadAt, { place: l.from, when: l.when })}</p>
          <div className="mt-3 flex justify-between border-t border-line-soft pt-3">
            <span className="text-body-sm text-ink-2">{t.youGet}</span>
            <span className="tabular text-title-3 text-ink">{naira(l.payoutKobo)}</span>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2.5 rounded-callout bg-warning-100 px-4 py-3 text-meta text-ink-2">
          <TriangleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0 text-warning" strokeWidth={1.8} />
          {t.strike}
        </p>
      </Sheet>

      <Sheet
        open={offer}
        onOpenChange={setOffer}
        title={l.offered ? t.replyTitle : t.offerTitle}
        description={l.offered ? t.replyText : fill(t.offerText, { amount: naira(l.freightKobo) })}
        actions={
          <Button className="w-full" loading={pending} disabled={!price} onClick={send}>
            {fill(t.send, { amount: price ? naira(Number(price.replace(/[^\d]/g, "")) * 100) : "" })}
          </Button>
        }
      >
        <label className="flex flex-col gap-2 text-body-sm font-semibold text-ink">
          {t.yourPrice}
          <span className="relative">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-body text-ink">₦</span>
            <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d,]/g, ""))} className="h-14 w-full rounded-input border border-line-field bg-surface pr-4 pl-9 text-body text-ink outline-none focus:border-green-700" />
          </span>
          <span className="flex items-center gap-1.5 text-caption font-normal text-ink-3">
            <Info aria-hidden className="size-3.5" strokeWidth={1.8} />
            {fill(t.range, { low: naira(low), high: naira(high) })}
          </span>
        </label>
      </Sheet>
    </div>
  );
}
