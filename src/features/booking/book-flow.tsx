"use client";

import { ArrowUpDown, Box, CalendarDays, Check, ChevronRight, Info, Lock, MapPin, Pencil, Plus, ShieldCheck, Truck, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatNaira } from "@/lib/money";
import { TruckGraphic, truckKind } from "@/components/art/truck";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { DraftSaved } from "@/features/checkout/screens";
import { availability, createLoad, quoteBooking, type BookingInput, type DayFree, type Quote } from "./actions";
import { ItemSheet, NoTruckSheet, PlaceSheet, unitFor, type Alternative, type City, type Goods, type ItemDraft, type Place } from "./book-sheets";

const f = messages.booking.flow;
const pr = f.price;
const ct = f.contacts;

type TruckType = { id: string; name: string; code: string; capacity: number };
type Slot = "morning" | "afternoon" | "evening" | "any";
type Props = { orgId: string; myName: string; cities: City[]; truckTypes: TruckType[]; goods: Goods[]; defaultFrom?: string; defaultTo?: string; allowSample?: boolean };

const naira = (kobo: number) => formatNaira(kobo / 100);
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
/** ₦1.7m: a compact label for the usual range only. */
const short = (kobo: number) => `₦${(kobo / 100_000_000).toFixed(1)}m`;
const HOURS: Record<Slot, [number, number]> = { morning: [6, 12], afternoon: [12, 17], evening: [17, 21], any: [6, 21] };
const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", ...opts }).format(new Date(`${day}T12:00:00+01:00`));
const iso = (day: string, hour: number) => `${day}T${String(hour).padStart(2, "0")}:00:00+01:00`;
const STORE = "fa_book_draft";

/** An item's weight in kg when known (tonnes, or a count with a weight each). Display only. */
function weightKg(i: ItemDraft) {
  const n = Number(i.amount) || 0;
  if (i.kind === "tonnes") return n * 1000;
  return i.unitWeightKg ? n * i.unitWeightKg : null;
}

function itemLine(i: ItemDraft, goods: Goods[]) {
  const code = goods.find((g) => g.id === i.goods)?.code ?? "";
  const unit = f.item.units[unitFor(code)];
  if (i.kind === "tonnes") return fill(f.itemTonnes, { n: i.amount });
  return i.unitWeightKg ? fill(f.itemEach, { n: Number(i.amount).toLocaleString("en-NG"), unit, kg: i.unitWeightKg }) : fill(f.itemCount, { n: Number(i.amount).toLocaleString("en-NG"), unit });
}

const nigerian = (raw: string) => /^[789][01]\d{8}$/.test(raw.replace(/\D/g, "").replace(/^234/, "").replace(/^0/, ""));

/**
 * S-02 Book a truck (mockups P08–P09b on phones, D03 on desktop). Phones: three steps (route, day, goods
 * and truck; who's at each end; price). From 1024 px: one page with the live order panel on the right.
 * Prices, offers and availability all come from the database (quote_booking, day_availability).
 */
export function BookFlow({ orgId, myName, cities, truckTypes, goods, defaultFrom, defaultTo, allowSample }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  // Previews only (D050): ?sample=1 fills in the mockup's booking, ?step=2|3 opens that step, for the
  // side-by-side checks against the mockups.
  const sample = allowSample && params.get("sample") === "1";
  const [step, setStep] = useState(sample ? Math.min(3, Math.max(1, Number(params.get("step")) || 1)) : 1);
  const [from, setFrom] = useState<Place>({ city: defaultFrom ?? "", address: sample ? "Apapa" : "", landmark: "" });
  const [to, setTo] = useState<Place>({ city: defaultTo ?? "", address: sample ? "Dawanau Market" : "", landmark: "" });
  const [via, setVia] = useState<Place[]>([]);
  const [viaOpen, setViaOpen] = useState<number | null>(null);
  const [days, setDays] = useState<DayFree[]>([]);
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState<Slot>("morning");
  const [items, setItems] = useState<ItemDraft[]>(() => {
    if (!sample) return [];
    const rice = goods.find((g) => g.code === "rice_bags")?.id ?? goods[0]?.id ?? "";
    const cartons = goods.find((g) => g.code === "cartons")?.id ?? rice;
    return [
      { goods: rice, description: "Bags of rice", kind: "count", amount: "600", unit: "bags", unitWeightKg: 50, valueNaira: "21000000" },
      { goods: cartons, description: "Cartons of noodles", kind: "count", amount: "200", unit: "cartons", unitWeightKg: undefined, valueNaira: "2400000" },
    ];
  });
  const [chosenType, setTruckType] = useState(truckTypes.find((t) => t.code === "flatbed_30t")?.id ?? truckTypes[0]?.id ?? "");
  const [loadingMe, setLoadingMe] = useState(true);
  const [loading, setLoading] = useState({ name: "", phone: "" });
  const [receiverMe, setReceiverMe] = useState(false);
  const [receiver, setReceiver] = useState(sample ? { name: "Amina Bello", phone: "806 555 0142" } : { name: "", phone: "" });
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"price" | "offer">(sample && params.get("offer") === "1" ? "offer" : "price");
  const [offer, setOffer] = useState<number | null>(null);
  const [quote, setQuote] = useState<Quote | null | "none">(null);
  // Previews: ?sheet=place|goods opens that sheet (P08a, P08b), ?full=1 a full day (P08c, D03b).
  const [sheet, setSheet] = useState<null | "from" | "to" | "item" | "noTruck" | "offer">(sample && params.get("sheet") === "place" ? "from" : sample && params.get("sheet") === "goods" ? "item" : null);
  const fullDay = sample && params.get("full") === "1";
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedLine, setSavedLine] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [pending, start] = useTransition();
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? "";
  const livestock = items.some((i) => goods.find((g) => g.id === i.goods)?.code === "livestock");
  const liquid = items.some((i) => ["fuel", "chemicals"].includes(goods.find((g) => g.id === i.goods)?.code ?? ""));
  const suggested = livestock ? "livestock" : liquid ? "tanker" : "flatbed_30t";
  // Livestock goes in a livestock truck and liquids in a tanker, whatever was tapped before.
  const forced = livestock || liquid ? truckTypes.find((t) => t.code === suggested)?.id : undefined;
  const truckType = forced ?? chosenType;
  const type = truckTypes.find((t) => t.id === truckType);

  // Saved as you go (D03): the booking in progress stays on this device until it's sent.
  useEffect(() => {
    if (sample) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved?.org === orgId) {
        // This device's saved booking can only be read after the page mounts (no storage on the server).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFrom(saved.from);
        setTo(saved.to);
        setItems(saved.items ?? []);
        setNote(saved.note ?? "");
        setReceiver(saved.receiver ?? { name: "", phone: "" });
      }
    } catch {
      // A broken draft is simply ignored.
    }
  }, [orgId, sample]);
  useEffect(() => {
    if (sample) return;
    localStorage.setItem(STORE, JSON.stringify({ org: orgId, from, to, items, note, receiver }));
  }, [orgId, from, to, items, note, receiver, sample]);

  // D055: free trucks per day, for the route.
  useEffect(() => {
    if (!from.city || !to.city || from.city === to.city) return;
    let live = true;
    void availability(orgId, from.city, to.city, 7).then((rows) => {
      if (!live) return;
      if (fullDay) {
        // P08c preview: the third day is full for every truck, as the mockup draws it.
        const third = [...new Set(rows.map((r) => r.day))][2];
        setDays(rows.map((r) => (r.day === third ? { ...r, free: 0 } : r)));
        setDay(third ?? "");
        setSheet("noTruck");
        return;
      }
      setDays(rows);
      const first = rows.find((r) => r.day > rows[0]?.day)?.day ?? rows[0]?.day ?? "";
      setDay((d) => d || first);
    });
    return () => {
      live = false;
    };
  }, [orgId, from.city, to.city, fullDay]);

  // The price for the route and truck.
  useEffect(() => {
    if (!from.city || !to.city || from.city === to.city || !truckType) return;
    let live = true;
    void quoteBooking(orgId, from.city, to.city, truckType, 1 + via.length).then((q) => {
      if (!live) return;
      // Previews only: the mockup's usual range when the database has no history behind one yet.
      setQuote(q ? (sample && !q.usual ? { ...q, usual: { low: 170000000, high: 200000000 } } : q) : "none");
      setOffer((o) => (q && o !== null ? Math.min(Math.max(o, q.minOffer), q.total - 100000) : o));
    });
    return () => {
      live = false;
    };
  }, [orgId, from.city, to.city, truckType, via.length, sample]);

  const dayList = useMemo(() => [...new Set(days.map((d) => d.day))], [days]);
  const freeOn = (d: string, t = truckType) => days.find((r) => r.day === d && r.truckType === t)?.free ?? 0;
  const q = quote && quote !== "none" ? quote : null;
  const known = items.map(weightKg);
  const totalKg = known.every((w) => w !== null) && items.length ? known.reduce<number>((a, b) => a + (b ?? 0), 0) : null;
  const tonnes = totalKg !== null ? Math.round(totalKg / 100) / 10 : null;
  const allowed = (t: TruckType) => (t.code === "livestock" ? livestock || !items.length : t.code === "tanker" ? liquid : !livestock);
  const myOffer = mode === "offer" && q ? (offer ?? q.chips[1]) : null;
  const total = myOffer ?? q?.total ?? 0;
  const transitDays = q ? Math.max(1, Math.ceil(q.typicalHours / 24)) : 0;

  const pickDay = (d: string) => {
    setDay(d);
    if (freeOn(d) === 0) setSheet("noTruck");
  };

  // P08c: the next day with this truck free (same price), or another type free that day.
  const alternatives: Alternative[] = [];
  if (day && type) {
    const next = dayList.find((d) => d > day && freeOn(d) > 0);
    if (next) alternatives.push({ key: "day", best: true, title: fill(f.noTruck.nextDay, { day: dayLabel(next, { weekday: "short", day: "numeric", month: "short" }), slot: f.slots[slot].toLowerCase() }), sub: fill(f.noTruck.nextDaySub, { n: freeOn(next), truck: f.trucks[type.code as keyof typeof f.trucks]?.toLowerCase() ?? type.name }), apply: () => setDay(next) });
    for (const other of truckTypes.filter((t) => t.id !== truckType && allowed(t) && freeOn(day, t.id) > 0).slice(0, 1)) {
      alternatives.push({ key: other.id, title: fill(f.noTruck.otherType, { day: dayLabel(day, { weekday: "short", day: "numeric" }), truck: (f.trucks[other.code as keyof typeof f.trucks] ?? other.name).toLowerCase() }), sub: fill(f.free, { n: freeOn(day, other.id) }), apply: () => setTruckType(other.id) });
    }
  }

  const contactsOk = (loadingMe || (loading.name.trim().length > 1 && nigerian(loading.phone))) && (receiverMe || (receiver.name.trim().length > 1 && nigerian(receiver.phone)));
  const step1Ok = from.city && to.city && from.address.trim().length >= 3 && to.address.trim().length >= 3 && items.length > 0 && day && q;

  const goStep = (n: number) => {
    setTried(true);
    if (n >= 2 && !step1Ok) return setError(!items.length ? f.errors.items : !from.address || !to.address ? f.errors.address : f.errors.route);
    if (n >= 3 && !contactsOk) return setError(null);
    setError(null);
    setTried(false);
    setStep(n);
    window.scrollTo({ top: 0 });
  };

  const submit = (pay: boolean) => {
    setTried(true);
    if (!step1Ok || !contactsOk || !q || !type) return setError(!items.length ? f.errors.items : f.errors.address);
    const place = (p: Place) => [p.address.trim(), p.landmark.trim()].filter(Boolean).join(", ");
    const input: BookingInput = {
      org: orgId,
      truckType,
      pickupFrom: iso(day, HOURS[slot][0]),
      pickupUntil: iso(day, HOURS[slot][1]),
      stops: [
        { city: from.city, address: place(from), name: loadingMe ? myName : loading.name, phone: loadingMe ? undefined : loading.phone },
        ...via.filter((v) => v.city && v.address.trim().length >= 3).map((v) => ({ city: v.city, address: place(v) })),
        { city: to.city, address: place(to), name: receiverMe ? myName : receiver.name, phone: receiverMe ? undefined : receiver.phone },
      ],
      items: items.map((i) => ({ ...i, amount: Number(i.amount), valueNaira: Number(i.valueNaira) || 0 })),
      note: note || undefined,
      offerNaira: myOffer ? myOffer / 100 : undefined,
    };
    start(async () => {
      const made = await createLoad(input);
      if (made.status !== "ok") return setError(made.status === "route" ? f.noRoute : (made.status === "error" && made.message) || f.errors.failed);
      localStorage.removeItem(STORE);
      // D049: a booking is a draft until it is paid; P10 Pay opens Bachs (D048).
      if (!pay) return setSavedLine(`${cityName(from.city)} → ${cityName(to.city)} · ${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(new Date(input.pickupFrom)).replace(",", "")}`);
      router.push(`/app/pay/${made.id}`);
    });
  };

  // ---- pieces ----------------------------------------------------------------------------------
  const route = (
    <Card title={f.routeHeading} deskOnly>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative rounded-card border border-line bg-surface px-4 lg:contents">
          <PlaceRow kind="from" place={from} name={cityName(from.city)} onOpen={() => setSheet("from")} />
          <span aria-hidden className="block h-px bg-line-soft lg:hidden" />
          <button
            type="button"
            onClick={() => (setFrom(to), setTo(from))}
            aria-label={f.swap}
            className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface text-ink lg:static lg:order-2 lg:translate-y-0"
          >
            <ArrowUpDown aria-hidden className="size-5" strokeWidth={1.8} />
          </button>
          <PlaceRow kind="to" place={to} name={cityName(to.city)} onOpen={() => setSheet("to")} />
        </div>
      </div>
      {via.map((v, n) => (
        <div key={n} className="mt-2 flex items-center gap-2">
          <button type="button" onClick={() => setViaOpen(n)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-tile border border-line bg-surface px-4 text-left">
            <MapPin aria-hidden className="size-4.5 shrink-0 text-ink-3" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block text-caption text-ink-3">{fill(f.stop, { n: n + 1 })}</span>
              <span className={cn("block truncate text-body font-semibold", !v.address && "text-ink-3")}>{v.address ? `${v.address}, ${cityName(v.city)}` : f.choosePlace}</span>
            </span>
          </button>
          <button type="button" aria-label={f.removeStop} onClick={() => setVia((list) => list.filter((_, i) => i !== n))} className="grid size-11 place-items-center rounded-full text-ink-3">
            <X aria-hidden className="size-5" strokeWidth={1.8} />
          </button>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-meta text-ink-3">{q ? fill(f.routeFacts, { km: q.distanceKm.toLocaleString("en-NG"), days: transitDays <= 1 ? f.daysOne : fill(f.daysRange, { a: transitDays, b: transitDays + 1 }) }) : null}</p>
        {via.length < 3 ? (
          <button type="button" onClick={() => (setVia((list) => [...list, { city: "", address: "", landmark: "" }]), setViaOpen(via.length))} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-body-sm font-semibold text-green-700">
            <Plus aria-hidden className="size-4" strokeWidth={2} />
            {f.addStop}
          </button>
        ) : null}
      </div>
      {quote === "none" ? <p className="mt-3 text-meta text-danger">{f.noRoute}</p> : null}
      {tried && (!from.address || !to.address) ? <p className="mt-2 text-label font-medium text-danger">{f.errors.address}</p> : null}
    </Card>
  );

  const dayTime = (
    <Card title={f.dayTimeHeading} phoneTitle={f.dayHeading}>
      <div className="grid grid-cols-4 gap-2 lg:grid-cols-6">
        {dayList.slice(0, 5).map((d, i) => {
          const n = freeOn(d);
          const on = d === day;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => pickDay(d)}
              className={cn("flex h-19 flex-col items-center justify-center rounded-tile border text-center", i >= 3 && "max-lg:hidden", on ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface", !on && n === 0 && "text-ink-3")}
            >
              <span className={cn("text-caption font-semibold uppercase", on ? "text-white/80" : "text-ink-2")}>{dayLabel(d, { weekday: "short" })}</span>
              <span className="tabular text-title-2">{dayLabel(d, { day: "numeric" })}</span>
              <span className={cn("text-micro font-medium", on ? "text-green-300" : n ? "text-green-700" : "text-ink-3")}>{n ? fill(f.free, { n }) : f.full}</span>
            </button>
          );
        })}
        <label className="relative flex h-19 cursor-pointer flex-col items-center justify-center gap-1 rounded-tile border border-line bg-surface text-caption font-semibold text-ink">
          <CalendarDays aria-hidden className="size-5" strokeWidth={1.8} />
          {f.other}
          <input type="date" aria-label={f.otherDay} min={dayList[0]} className="absolute inset-0 opacity-0" onChange={(e) => e.target.value && pickDay(e.target.value)} />
        </label>
      </div>
      <div role="radiogroup" aria-label={f.dayTimeHeading} className="mt-3 grid grid-cols-4 gap-2 lg:flex">
        {(Object.keys(f.slots) as Slot[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={slot === s} onClick={() => setSlot(s)} className={cn("h-10 min-w-0 rounded-pill border px-1 text-body-sm whitespace-nowrap lg:px-4", slot === s ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}>
            {f.slots[s]}
            {slot === s ? <span className="hidden lg:inline"> · {f.slotHours[s]}</span> : null}
          </button>
        ))}
      </div>
    </Card>
  );

  const fits = tonnes !== null && type ? totalKg! <= type.capacity : true;
  const goodsCard = (
    <Card title={f.sending} aside={tonnes !== null && items.length ? <span className="hidden text-meta text-ink-3 lg:inline">{fits ? fill(f.fitsShort, { t: tonnes }) : ""}</span> : null}>
      {items.length ? (
        <div aria-hidden className="hidden h-11 items-center gap-3.5 rounded-t-inner bg-table-head px-0 text-caption font-semibold tracking-[0.04em] text-ink-3 uppercase lg:flex">
          <span className="flex-1 pl-0">{f.cols.item}</span>
          <span className="w-50">{f.cols.amount}</span>
          <span className="w-40">{f.cols.value}</span>
          <span className="w-14" />
        </div>
      ) : null}
      {items.length ? (
        <ul className="rounded-card border border-line bg-surface px-4 lg:border-0 lg:px-0">
          {items.map((i, n) => (
            <li key={n} className="flex min-h-16 items-center gap-3.5 border-line-soft py-3 not-first:border-t">
              <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-warning-100">
                <Image src="/art/box.webp" alt="" width={26} height={21} className="w-6.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink lg:text-body-sm">{i.description}</span>
                <span className="block text-meta text-ink-3 lg:hidden">{itemLine(i, goods)}</span>
              </span>
              <span className="hidden w-50 text-body-sm font-normal text-ink lg:block">{itemLine(i, goods)}</span>
              {i.valueNaira ? <span className="tabular hidden w-40 text-body text-ink lg:block">{naira(Number(i.valueNaira) * 100)}</span> : null}
              <button type="button" aria-label={`${f.edit} ${i.description}`} onClick={() => (setEditing(n), setSheet("item"))} className="grid size-11 place-items-center rounded-full text-ink-2 lg:w-auto lg:px-3 lg:text-body-sm lg:font-semibold lg:text-green-700">
                <Pencil aria-hidden className="size-4.5 lg:hidden" strokeWidth={1.8} />
                <span className="hidden lg:inline">{f.edit}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" onClick={() => (setEditing(null), setSheet("item"))} className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-strong text-body font-semibold text-green-700">
        <Plus aria-hidden className="size-5" strokeWidth={1.8} />
        {items.length ? f.addItem : f.addFirst}
      </button>
      {items.length ? (
        <p className={cn("mt-3 flex items-start gap-2.5 rounded-callout px-4 py-3 text-meta", fits ? "bg-green-50 text-green-800" : "bg-warning-100 text-ink")}>
          <Info aria-hidden className="mt-0.5 size-4.5 shrink-0" strokeWidth={1.8} />
          {tonnes === null ? f.totalUnknown : fits ? fill(f.totalFits, { t: tonnes }) : fill(f.totalSplit, { t: tonnes, truck: (f.trucks[type?.code as keyof typeof f.trucks] ?? "").toLowerCase() })}
        </p>
      ) : tried ? (
        <p className="mt-2 text-label font-medium text-danger">{f.errors.items}</p>
      ) : null}
    </Card>
  );

  const truckCard = (
    <Card title={f.truckHeading}>
      <div className="grid grid-cols-4 gap-2 lg:gap-3">
        {truckTypes
          .filter((t) => ["flatbed_30t", "covered_20t", "tipper", "tanker", "livestock"].includes(t.code))
          .filter((t) => t.code !== "livestock" || livestock)
          .slice(0, 4)
          .map((t) => {
            const on = t.id === truckType;
            const ok = allowed(t);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                disabled={!ok}
                onClick={() => setTruckType(t.id)}
                className={cn("relative flex h-23.5 flex-col items-center justify-center gap-1 rounded-tile border text-center lg:h-24 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-left", on ? "border-2 border-green-700 bg-green-50" : "border-line bg-surface", !ok && "opacity-45")}
              >
                {t.code === suggested ? <span className="absolute -top-2.5 left-2 rounded-pill bg-green-700 px-2 py-0.5 text-micro text-white lg:hidden">{f.suggested}</span> : null}
                <TruckGraphic kind={truckKind(t.code)} load={null} className="w-12 shrink-0" />
                <span>
                  <span className={cn("block text-body-sm", on && "text-green-800")}>{f.trucks[t.code as keyof typeof f.trucks] ?? t.name}</span>
                  <span className="block text-caption text-ink-3">{t.code === "tanker" ? (
                      <>
                        <span className="lg:hidden">{f.liquidsShort}</span>
                        <span className="hidden lg:inline">{f.liquids}</span>
                      </>
                    ) : (
                      <>
                        {fill(f.tonnesShort, { n: t.capacity / 1000 })}
                        {t.code === suggested ? <span className="hidden lg:inline"> · {f.suggested.toLowerCase()}</span> : null}
                      </>
                    )}</span>
                </span>
              </button>
            );
          })}
      </div>
    </Card>
  );

  const contactBlock = (who: "loading" | "receiver") => {
    const me = who === "loading" ? loadingMe : receiverMe;
    const setMe = who === "loading" ? setLoadingMe : setReceiverMe;
    const v = who === "loading" ? loading : receiver;
    const set = who === "loading" ? setLoading : setReceiver;
    const place = cityName(who === "loading" ? from.city : to.city);
    return (
      <section className={cn("rounded-card border border-line bg-surface p-4.5", who === "loading" && me && "lg:border-0 lg:bg-green-50")}>
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-icon lg:hidden", who === "loading" ? "bg-green-50 text-green-700" : "bg-warning-100 text-warning")}>
            {who === "loading" ? <Box aria-hidden className="size-5" strokeWidth={1.8} /> : <MapPin aria-hidden className="size-5" strokeWidth={1.8} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-title-3 text-ink">
              <span className="lg:hidden">{fill(who === "loading" ? ct.loadingAt : ct.receiverAt, { place })}</span>
              <span className="hidden lg:inline">{who === "loading" ? ct.loading : ct.receiver}</span>
            </span>
            <span className="block text-meta text-ink-3 lg:hidden">{who === "loading" ? ct.loadingSub : ct.receiverSub}</span>
            {who === "loading" && me ? <span className="hidden text-meta text-ink-3 lg:block">{ct.loadingDesk}</span> : null}
          </span>
          <span className="hidden lg:block">
            <Toggle id={`${who}-me-desk`} label={who === "loading" ? ct.loadingMe : ct.receiverMe} short={ct.me} checked={me} onChange={setMe} />
          </span>
        </div>
        <span className="lg:hidden">
          <Toggle id={`${who}-me`} label={who === "loading" ? ct.loadingMe : ct.receiverMe} short={ct.me} checked={me} onChange={setMe} />
        </span>
        {me ? null : (
          <div className="mt-3 flex flex-col gap-3">
            <label className="block">
              <span className="mb-2 block text-body-sm text-ink lg:sr-only">{who === "loading" ? ct.loadingName : ct.receiverName}</span>
              <input value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} autoComplete="off" placeholder={ct.name} className={inputCls} maxLength={80} />
            </label>
            {tried && v.name.trim().length < 2 ? <p className="text-label font-medium text-danger">{ct.errors.name}</p> : null}
            <label className="block">
              <span className="mb-2 block text-body-sm text-ink lg:sr-only">{who === "loading" ? ct.phone : ct.receiverPhone}</span>
              <span className="flex h-14 items-center gap-3 rounded-input border border-line-field bg-surface px-4 focus-within:border-field focus-within:border-green-700 focus-within:shadow-focus">
                <span className="text-body font-semibold text-ink">+234</span>
                <span aria-hidden className="h-6 w-px bg-line" />
                <input value={v.phone} onChange={(e) => set({ ...v, phone: e.target.value })} inputMode="tel" placeholder="806 555 0142" className="min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none placeholder:text-placeholder" />
              </span>
            </label>
            {tried && !nigerian(v.phone) ? <p className="text-label font-medium text-danger">{ct.errors.phone}</p> : null}
          </div>
        )}
      </section>
    );
  };

  const contacts = (
    <Card title={ct.title} deskOnly>
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {contactBlock("loading")}
        {contactBlock("receiver")}
      </div>
      <label className="mt-6 block lg:mt-4">
        <span className="mb-2 block text-body-sm text-ink">
          {ct.note} <span className="font-medium text-ink-3">{ct.optional}</span>
        </span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder={ct.notePlaceholder} className={cn(inputCls, "h-auto min-h-20 py-3.5")} />
      </label>
    </Card>
  );

  const offerBox = q ? <OfferBox q={q} offer={offer} setOffer={setOffer} /> : null;
  const choices = q ? (
    <div role="radiogroup" aria-label={pr.how} className="flex flex-col gap-2.5">
      <Choice on={mode === "price"} onClick={() => setMode("price")} title={fill(pr.bookAt, { price: naira(q.total) })} badge={pr.fastest} sub={mode === "price" ? pr.bookAtSub : undefined} />
      <Choice on={mode === "offer"} onClick={() => (setMode("offer"), setOffer((o) => o ?? q.chips[1]))} title={pr.offerOwn} sub={mode === "offer" ? undefined : pr.offerOwnSub}>
        {mode === "offer" ? offerBox : null}
      </Choice>
    </div>
  ) : null;

  const receiverName = receiverMe ? null : receiver.name.trim().split(/\s+/)[0] || null;
  const summary: { label: string; value: string; step: number }[] = [
    { label: pr.route, value: `${from.address || cityName(from.city)}${from.address ? `, ${cityName(from.city)}` : ""} → ${to.address || cityName(to.city)}${to.address ? `, ${cityName(to.city)}` : ""}`, step: 1 },
    { label: pr.pickup, value: day ? `${dayLabel(day, { weekday: "short", day: "numeric", month: "short" })} · ${f.slots[slot].toLowerCase()}` : "", step: 1 },
    { label: items.length > 1 ? fill(pr.goods, { n: items.length }) : pr.goodsOne, value: items.map((i) => `${i.description}, ${i.kind === "tonnes" ? fill(f.itemTonnes, { n: i.amount }) : `${Number(i.amount).toLocaleString("en-NG")} ${f.item.units[unitFor(goods.find((g) => g.id === i.goods)?.code ?? "")]}`}`).join(" · "), step: 1 },
    { label: pr.truck, value: type ? `${f.trucks[type.code as keyof typeof f.trucks] ?? type.name}, ${fill(f.tonnesShort, { n: type.capacity / 1000 })}` : "", step: 1 },
    { label: pr.contacts, value: `${loadingMe ? pr.youLoad : fill(pr.loadsBy, { name: loading.name })} · ${receiverMe ? pr.youReceive : fill(pr.receives, { name: receiver.name })}`, step: 2 },
  ];

  const payLabel = myOffer ? fill(pr.payOffer, { amount: naira(myOffer) }) : fill(pr.pay, { amount: naira(total) });
  const actions = (
    <>
      <Button className="w-full" loading={pending} loadingLabel={pr.paying} onClick={() => submit(true)} disabled={!q}>
        <Lock aria-hidden strokeWidth={1.8} />
        {payLabel}
      </Button>
      <Button variant="tertiary" size="text" className="w-full" disabled={pending || !q} onClick={() => submit(false)}>
        {pr.saveDraft}
      </Button>
    </>
  );

  return (
    <div data-full-screen className="bg-paper lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_440px]">
      {/* ---- the form ---- */}
      <div className="flex min-h-dvh flex-col lg:min-h-0 lg:px-10 lg:pt-8 lg:pb-12">
        <header className="sticky top-0 z-10 bg-paper px-4 pt-3.5 pb-3 lg:static lg:mx-auto lg:w-full lg:max-w-170 lg:p-0">
          <div className="flex items-center gap-3">
            {step === 1 ? (
              <Link href="/app/ship" aria-label={f.close} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface lg:hidden">
                <X aria-hidden className="size-5" strokeWidth={1.8} />
              </Link>
            ) : (
              <button type="button" onClick={() => setStep(step - 1)} aria-label={f.back} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface lg:hidden">
                <ChevronRight aria-hidden className="size-5 rotate-180" strokeWidth={1.8} />
              </button>
            )}
            <h1 className="min-w-0 flex-1 text-title-2 text-ink lg:text-[2.25rem] lg:leading-[1.08] lg:tracking-[-0.04em]">
              <span className="lg:hidden">{step === 1 ? f.title : step === 2 ? ct.title : pr.title}</span>
              <span className="hidden lg:inline">{f.title}</span>
            </h1>
            <span className="text-label font-medium text-ink-3 lg:hidden">{fill(f.step, { n: step })}</span>
            <span className="hidden text-meta text-ink-3 lg:inline">{f.savedLocal}</span>
          </div>
          <div aria-hidden className="mt-3 grid grid-cols-3 gap-1.5 lg:hidden">
            {[1, 2, 3].map((n) => (
              <i key={n} className={cn("h-1.25 rounded-pill", n <= step ? "bg-green-700" : "bg-line-field")} />
            ))}
          </div>
        </header>

        <div className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 pt-2 pb-36 lg:max-w-170 lg:gap-4 lg:px-0 lg:pt-6 lg:pb-0">
          <div className={cn("flex flex-col gap-6 lg:gap-4", step !== 1 && "max-lg:hidden")}>
            {route}
            {dayTime}
            {goodsCard}
            {truckCard}
          </div>
          <div className={cn(step !== 2 && "max-lg:hidden")}>{contacts}</div>
          {step === 3 && q ? (
            <div className="flex flex-col gap-5 lg:hidden">
              {mode === "price" ? <PriceCard q={q} /> : <OurPriceRow q={q} />}
              <section>
                <h2 className="mb-3 text-body font-semibold text-ink">{pr.how}</h2>
                {choices}
              </section>
              {mode === "price" ? (
                <section>
                  <h2 className="mb-3 text-body font-semibold text-ink">{pr.yourBooking}</h2>
                  <dl className="rounded-card border border-line bg-surface px-4">
                    {summary.map((s) => (
                      <div key={s.label} className="flex items-center gap-3 border-line-soft py-3.5 not-first:border-t">
                        <div className="min-w-0 flex-1">
                          <dt className="text-caption text-ink-3">{s.label}</dt>
                          <dd className="text-body font-semibold text-ink">{s.value}</dd>
                        </div>
                        <button type="button" onClick={() => setStep(s.step)} className="px-2 py-3 text-body-sm font-semibold text-green-700">
                          {f.edit}
                        </button>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : (
                <HowOffers />
              )}
              {mode === "price" ? (
                <p className="flex items-start gap-3 rounded-callout bg-green-50 px-4 py-3.5 text-meta text-green-800">
                  <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" strokeWidth={1.8} />
                  {fill(pr.held, { receiver: receiverName ?? pr.theReceiver })}
                </p>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-callout bg-danger-100 px-4 py-3 text-body-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        {/* ---- phone bottom bar ---- */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),24px)] lg:hidden">
          {step < 3 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {q ? (
                  <>
                    <p className="text-caption text-ink-3">{q.usual ? f.usualLabel : f.ourPriceLabel}</p>
                    <p className="tabular text-title-2 text-ink">{q.usual ? fill(f.usualRange, { low: short(q.usual.low), high: short(q.usual.high) }) : naira(q.total)}</p>
                  </>
                ) : null}
              </div>
              <Button onClick={() => goStep(step + 1)} className="px-6">
                {step === 1 ? f.next : f.seePrice}
                <ChevronRight aria-hidden strokeWidth={2} />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col">{actions}</div>
          )}
        </div>
      </div>

      {/* ---- desktop order panel (D03) ---- */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-l border-line bg-surface lg:flex">
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-7">
          <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{pr.yourOrder}</p>
          <p className="mt-1 text-title-2 text-ink">{from.city && to.city ? `${cityName(from.city)} → ${cityName(to.city)}` : f.title}</p>
          <RouteArt />
          <ul className="mt-2">
            <PanelRow icon={<CalendarDays />} label={pr.pickup} value={summary[1].value} />
            <PanelRow icon={<Box />} label={items.length ? `${fill(pr.goods, { n: items.length })}${tonnes !== null ? ` · ${fill(f.itemTonnes, { n: tonnes }).toLowerCase()}` : ""}` : pr.goodsOne} value={items.map((i) => `${i.description.split(" ").slice(-1)[0]} ${i.amount}`).join(" · ") || "—"} />
            <PanelRow icon={<Truck />} label={pr.truck} value={summary[3].value} />
            <PanelRow icon={<UserRound />} label={pr.contacts} value={summary[4].value} />
          </ul>
          {q ? (
            <div role="radiogroup" aria-label={pr.how} className="mt-5 flex flex-col gap-2.5">
              <button type="button" role="radio" aria-checked={mode === "price"} onClick={() => setMode("price")} className={cn("flex h-13 items-center gap-3 rounded-pill border px-4", mode === "price" ? "border-2 border-green-700" : "border-line")}>
                <Radio on={mode === "price"} />
                <span className="flex-1 text-left text-body font-semibold">{pr.bookAtOur}</span>
                <span className="tabular text-body font-semibold">{naira(q.total)}</span>
              </button>
              <button type="button" role="radio" aria-checked={mode === "offer"} onClick={() => (setMode("offer"), setOffer((o) => o ?? q.chips[1]), setSheet("offer"))} className={cn("flex h-13 items-center gap-3 rounded-pill border px-4", mode === "offer" ? "border-2 border-green-700" : "border-line")}>
                <Radio on={mode === "offer"} />
                <span className="flex-1 text-left text-body font-semibold">{myOffer ? fill(pr.offerSet, { amount: naira(myOffer) }) : pr.offerOwn}</span>
                <ChevronRight aria-hidden className="size-4.5 text-ink-3" strokeWidth={1.8} />
              </button>
            </div>
          ) : null}
          <p className="mt-6 text-caption font-semibold tracking-caps text-ink-3 uppercase">{pr.included}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {pr.includedList.map((x) => (
              <li key={x} className="flex items-center gap-2.5 text-body-sm font-normal text-ink">
                <Check aria-hidden className="size-4 text-green-700" strokeWidth={2} />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line px-7 pt-5 pb-6">
          {q ? (
            <dl className="flex flex-col gap-1.5 text-body-sm font-normal text-ink-2">
              <div className="flex justify-between">
                <dt>{pr.truckDriver}</dt>
                <dd className="tabular">{mode === "offer" && offer ? "" : naira(q.freight)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{pr.serviceFee}</dt>
                <dd className="tabular">{mode === "offer" && offer ? "" : q.fee ? naira(q.fee) : pr.noFee}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-ink">
                <dt className="text-body font-semibold">{pr.total}</dt>
                <dd className="tabular text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">{naira(total)}</dd>
              </div>
            </dl>
          ) : null}
          <div className="mt-4 flex flex-col">{actions}</div>
          <p className="mt-1 text-center text-caption text-ink-3">{pr.deskNote}</p>
        </div>
      </aside>

      <PlaceSheet open={sheet === "from"} onOpenChange={(o) => setSheet(o ? "from" : null)} kind="from" cities={cities} value={from} onSave={setFrom} />
      <PlaceSheet open={sheet === "to"} onOpenChange={(o) => setSheet(o ? "to" : null)} kind="to" cities={cities} value={to} onSave={setTo} />
      {viaOpen !== null && via[viaOpen] ? (
        <PlaceSheet
          open
          onOpenChange={(o) => !o && setViaOpen(null)}
          kind="to"
          cities={cities}
          value={via[viaOpen]}
          onSave={(p) => setVia((list) => list.map((x, i) => (i === viaOpen ? p : x)))}
        />
      ) : null}
      <ItemSheet
        open={sheet === "item"}
        onOpenChange={(o) => setSheet(o ? "item" : null)}
        goods={goods}
        value={editing !== null ? (items[editing] ?? null) : null}
        onSave={(i) => setItems((list) => (editing !== null ? list.map((x, n) => (n === editing ? i : x)) : [...list, i].slice(0, 10)))}
        onRemove={editing !== null ? () => setItems((list) => list.filter((_, n) => n !== editing)) : undefined}
      />
      {type && day ? (
        <NoTruckSheet
          open={sheet === "noTruck"}
          onOpenChange={(o) => setSheet(o ? "noTruck" : null)}
          title={fill(f.noTruck.title, { truck: (f.trucks[type.code as keyof typeof f.trucks] ?? type.name).toLowerCase(), day: dayLabel(day, { weekday: "short", day: "numeric" }) })}
          text={fill(f.noTruck.text, { truck: (f.trucks[type.code as keyof typeof f.trucks] ?? type.name).toLowerCase(), route: `${cityName(from.city)} → ${cityName(to.city)}` })}
          options={alternatives}
          onOther={() => undefined}
        />
      ) : null}
      {q ? (
        <Dialog open={sheet === "offer"} onOpenChange={(o) => setSheet(o ? "offer" : null)} title={pr.offerDialog} actions={<Button onClick={() => setSheet(null)}>{pr.useOffer}</Button>}>
          {offerBox}
          <div className="mt-4">
            <HowOffers />
          </div>
        </Dialog>
      ) : null}
      <DraftSaved open={savedLine !== null} onOpenChange={(o) => (o ? null : setSavedLine(null))} line={savedLine ?? ""} />
    </div>
  );
}

const inputCls =
  "h-14 w-full min-w-0 rounded-input border border-line-field bg-surface px-4 text-body font-medium text-ink outline-none placeholder:text-placeholder focus:border-field focus:border-green-700 focus:shadow-focus";

function Card({ title, phoneTitle, deskOnly, aside, children }: { title: string; phoneTitle?: string; deskOnly?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-6">
      <div className={cn("mb-3 flex items-baseline justify-between gap-3 lg:mb-4", deskOnly && "max-lg:hidden")}>
        <h2 className="text-body font-semibold text-ink lg:text-title-3">
          {phoneTitle ? <span className="lg:hidden">{phoneTitle}</span> : null}
          <span className={phoneTitle ? "hidden lg:inline" : undefined}>{title}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function PlaceRow({ kind, place, name, onOpen }: { kind: "from" | "to"; place: Place; name: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex w-full min-w-0 items-center gap-3.5 py-3.5 pr-14 text-left lg:flex-1 lg:rounded-tile lg:border lg:border-line lg:px-4 lg:py-3 lg:pr-4" style={{ order: kind === "from" ? 1 : 3 }}>
      {kind === "from" ? <span aria-hidden className="size-3.5 shrink-0 rounded-full border-[3px] border-green-100 bg-green-700 ring-1 ring-green-700" /> : <MapPin aria-hidden className="size-4.5 shrink-0 text-warning" strokeWidth={1.8} />}
      <span className="min-w-0">
        <span className="block text-caption font-semibold tracking-caps text-ink-3 uppercase lg:text-micro lg:font-medium lg:tracking-normal lg:normal-case">{kind === "from" ? f.pickup : f.deliver}</span>
        <span className={cn("block truncate text-title-3 lg:text-body lg:font-semibold", !place.address && "text-ink-3")}>{place.address ? `${place.address}, ${name}` : name || f.choosePlace}</span>
      </span>
    </button>
  );
}

function Toggle({ id, label, short, checked, onChange }: { id: string; label: string; short: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 lg:mt-0 lg:gap-2">
      <span className="text-body font-semibold text-ink">
        <span className="lg:hidden">{label}</span>
        <span className="hidden text-caption lg:inline">{short}</span>
      </span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn("relative h-8 w-13 shrink-0 rounded-pill transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-green-100", checked ? "bg-green-700" : "bg-control-off")}>
        <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow-knob transition-all", checked ? "left-6" : "left-1")} />
      </span>
    </label>
  );
}

function Radio({ on }: { on: boolean }) {
  return <span aria-hidden className={cn("size-6 shrink-0 rounded-full border-field bg-surface", on ? "border-[7px] border-green-700" : "border-line-strong")} />;
}

function Choice({ on, onClick, title, badge, sub, children }: { on: boolean; onClick: () => void; title: string; badge?: string; sub?: string; children?: ReactNode }) {
  return (
    <div className={cn("rounded-card border", on ? "border-2 border-green-700 bg-green-50/40" : "border-line bg-surface")}>
      <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cn("flex w-full items-start gap-3 text-left", on ? "px-4 py-3.75" : "px-4.5 py-4")}>
        <Radio on={on} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-title-3 text-ink">
            {title}
            {badge ? <span className="rounded-pill bg-green-50 px-2 py-0.5 text-caption font-semibold text-green-700">{badge}</span> : null}
          </span>
          {sub ? <span className="mt-0.5 block text-meta text-ink-3">{sub}</span> : null}
        </span>
      </button>
      {children ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

function PriceCard({ q }: { q: Quote }) {
  return (
    <section className="relative overflow-hidden rounded-hero bg-green-900 p-5.5 text-white">
      <span aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-white/5" />
      <p className="text-body-sm font-normal text-white/80">{pr.ourPrice}</p>
      <p className="tabular mt-1 text-[2.75rem] leading-none font-semibold tracking-[-0.04em]">{naira(q.total)}</p>
      {q.usual ? (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-green-300/16 px-2.5 py-1 text-caption font-semibold text-green-300">
          <Check aria-hidden className="size-3.5" strokeWidth={2.2} />
          {fill(pr.within, { range: fill(f.usualRange, { low: short(q.usual.low), high: short(q.usual.high) }) })}
        </span>
      ) : null}
      <dl className="mt-5 flex flex-col gap-1.5 border-t border-white/12 pt-4 text-body-sm font-normal">
        <div className="flex justify-between">
          <dt>{pr.truckDriver}</dt>
          <dd className="tabular">{naira(q.freight)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{pr.serviceFee}</dt>
          <dd className="tabular">{q.fee ? naira(q.fee) : pr.noFee}</dd>
        </div>
      </dl>
    </section>
  );
}

function OurPriceRow({ q }: { q: Quote }) {
  return (
    <div className="flex items-center justify-between rounded-pill border border-line bg-surface px-4 py-3.5">
      <span className="text-body-sm font-normal text-ink-2">{pr.ourPrice.split(" for ")[0]}</span>
      <span className="tabular text-title-3 text-ink">{naira(q.total)}</span>
    </div>
  );
}

/** P09b: the sender's own price (fee included), quick choices, the meter, the floor. */
function OfferBox({ q, offer, setOffer }: { q: Quote; offer: number | null; setOffer: (v: number) => void }) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const value = offer ?? q.chips[1];
  const tooLow = value < q.minOffer;
  const odd = value % 100000 !== 0;
  // Guidance only: closer to our price is likelier to be accepted.
  const level = value >= q.chips[0] ? 3 : value >= q.chips[1] ? 2 : 1;
  return (
    <div className="text-center">
      <p className="text-caption text-ink-3">{pr.yourOffer}</p>
      {typing ? (
        <label className="mt-1 block">
          <span className="sr-only">{pr.yourOffer}</span>
          <input
            autoFocus
            inputMode="numeric"
            value={text}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setText(digits ? Number(digits).toLocaleString("en-NG") : "");
              if (digits) setOffer(Number(digits) * 100);
            }}
            className="tabular w-full bg-transparent text-center text-[2.5rem] leading-tight font-semibold tracking-[-0.04em] text-ink outline-none"
          />
        </label>
      ) : (
        <p className="tabular mt-1 text-[2.5rem] leading-tight font-semibold tracking-[-0.04em] text-ink">{naira(value)}</p>
      )}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {q.chips.map((c, i) => (
          <button key={c} type="button" aria-pressed={!typing && value === c} onClick={() => (setTyping(false), setOffer(c))} className={cn("h-11 rounded-pill border text-body-sm", !typing && value === c ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface")}>
            −{[5, 8, 10][i]}%
          </button>
        ))}
        <button type="button" aria-pressed={typing} onClick={() => (setTyping(true), setText(""))} className={cn("h-11 rounded-pill border text-body-sm", typing ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface")}>
          {pr.typeIt}
        </button>
      </div>
      <div className="mt-4 text-left">
        <div className="flex items-center justify-between text-label">
          <span>{pr.chance}</span>
          <span className={level === 3 ? "text-success" : level === 2 ? "text-warning" : "text-danger"}>{level === 3 ? pr.chanceGood : level === 2 ? pr.chanceFair : pr.chanceLow}</span>
        </div>
        <div aria-hidden className="mt-2 grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <i key={n} className={cn("h-1.5 rounded-pill", n <= level ? (level === 3 ? "bg-success" : level === 2 ? "bg-warning" : "bg-danger") : "bg-track")} />
          ))}
        </div>
        <p className={cn("mt-3 text-caption", tooLow || odd ? "text-danger" : "text-ink-3")}>
          {tooLow ? fill(pr.tooLow, { amount: naira(q.minOffer) }) : odd ? pr.notThousands : null}
          {!tooLow && !odd && q.acceptedFrom ? `${fill(pr.usuallyFrom, { amount: naira(q.acceptedFrom) })} ` : null}
          {!tooLow && !odd ? fill(pr.lowest, { amount: naira(q.minOffer) }) : null}
        </p>
      </div>
    </div>
  );
}

function HowOffers() {
  return (
    <section className="rounded-card border border-line bg-surface p-4.5">
      <h2 className="text-title-3 text-ink">{pr.howOffers}</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {pr.howSteps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-body-sm font-normal text-ink">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-caption">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PanelRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-center gap-3.5 border-line-soft py-3 not-first:border-t">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-icon bg-paper text-ink-2 [&_svg]:size-4.5 [&_svg]:stroke-[1.8]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-caption text-ink-3">{label}</span>
        <span className="block truncate text-body font-semibold text-ink">{value || "—"}</span>
      </span>
    </li>
  );
}

/** D03's little map: a road from pick-up to delivery. Decorative. */
function RouteArt() {
  return (
    <svg aria-hidden viewBox="0 0 380 120" className="mt-4 h-30 w-full rounded-map bg-paper">
      <path d="M0 40 L380 20 M0 90 L380 75 M120 0 L135 120 M260 0 L270 120" className="stroke-white" strokeWidth="10" />
      <path d="M40 95 C 120 80, 200 60, 345 25" className="stroke-green-700" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="95" r="7" className="fill-white stroke-green-700" strokeWidth="3" />
      <circle cx="345" cy="25" r="6" className="fill-green-700" />
    </svg>
  );
}
