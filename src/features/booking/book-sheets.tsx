"use client";

import { CalendarDays, MapPin, Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import type { BookingItem } from "./actions";

const f = messages.booking.flow;

export type City = { id: string; name: string };
export type Goods = { id: string; name: string; code: string };
export type Place = { city: string; address: string; landmark: string };

const fieldCls =
  "h-14 w-full min-w-0 rounded-input border border-line-field bg-surface px-4 text-body font-medium text-ink outline-none placeholder:text-placeholder focus:border-field focus:border-green-700 focus:shadow-focus";
const label = "mb-2 block text-body-sm text-ink";

/** P08a: the town (our corridor towns only) and the address with a landmark. */
export function PlaceSheet({ open, onOpenChange, kind, cities, value, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; kind: "from" | "to"; cities: City[]; value: Place; onSave: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(open);
  if (open !== seen) {
    setSeen(open);
    if (open) {
      setDraft(value);
      setQ("");
    }
  }
  const shown = cities.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const ok = draft.city && draft.address.trim().length >= 3;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      kind="confirm"
      title={kind === "from" ? f.place.from : f.place.to}
      actions={
        <Button className="w-full" disabled={!ok} onClick={() => (onSave(draft), onOpenChange(false))}>
          {f.place.use}
        </Button>
      }
    >
      <label className="relative block">
        <span className="sr-only">{f.place.search}</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.place.search} className={cn(fieldCls, "pl-12")} />
      </label>
      <p className="mt-4 text-caption font-semibold tracking-caps text-ink-3 uppercase">{f.place.town}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {shown.length ? (
          shown.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={draft.city === c.id}
              onClick={() => setDraft({ ...draft, city: c.id })}
              className={cn("h-10 rounded-pill border px-4 text-body-sm", draft.city === c.id ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}
            >
              {c.name}
            </button>
          ))
        ) : (
          <p className="text-meta text-ink-3">{f.place.none}</p>
        )}
      </div>
      <label className="mt-5 block">
        <span className={label}>{f.place.address}</span>
        <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder={f.place.addressPlaceholder} maxLength={160} className={fieldCls} />
      </label>
      <label className="mt-4 block">
        <span className={label}>{f.place.landmark}</span>
        <input value={draft.landmark} onChange={(e) => setDraft({ ...draft, landmark: e.target.value })} placeholder={f.place.landmarkPlaceholder} maxLength={38} className={fieldCls} />
      </label>
      <p className="mt-4 rounded-callout bg-green-50 px-4 py-3 text-meta text-green-800">{f.place.hint}</p>
    </Sheet>
  );
}

export type ItemDraft = Omit<BookingItem, "amount" | "valueNaira"> & { amount: string; valueNaira: string };

/** The unit a count is in, from what the goods are. */
export function unitFor(code: string): NonNullable<BookingItem["unit"]> {
  if (code === "livestock") return "head";
  if (code.endsWith("_bags") || code === "cement") return "bags";
  if (code === "cartons" || code === "drinks") return "cartons";
  if (code === "fuel" || code === "chemicals") return "drums";
  return "pieces";
}

const QUICK = ["grain_bags", "cement", "cartons", "building", "fresh_produce", "livestock", "machinery"];

/** P08b: one item. What it is, a description, tonnes or a count with a stepper, and its value. */
export function ItemSheet({ open, onOpenChange, goods, value, onSave, onRemove }: { open: boolean; onOpenChange: (o: boolean) => void; goods: Goods[]; value: ItemDraft | null; onSave: (i: ItemDraft) => void; onRemove?: () => void }) {
  const blank: ItemDraft = { goods: "", description: "", kind: "count", amount: "", unit: "pieces", unitWeightKg: undefined, valueNaira: "" };
  const [d, setD] = useState<ItemDraft>(value ?? blank);
  const [all, setAll] = useState(false);
  const [tried, setTried] = useState(false);
  const [seen, setSeen] = useState(open);
  if (open !== seen) {
    setSeen(open);
    if (open) {
      setD(value ?? blank);
      setTried(false);
      setAll(false);
    }
  }
  const code = goods.find((g) => g.id === d.goods)?.code ?? "";
  const livestock = code === "livestock";
  const quick = goods.filter((g) => QUICK.includes(g.code) || g.id === d.goods);
  const list = all ? goods : quick;
  const amount = Number(d.amount) || 0;
  const step = (by: number) => setD({ ...d, amount: String(Math.max(1, amount + by)) });
  const errors = { goods: !d.goods, describe: d.description.trim().length < 2, amount: !(amount > 0) };
  const save = () => {
    setTried(true);
    if (errors.goods || errors.describe || errors.amount) return;
    onSave({ ...d, kind: livestock ? "count" : d.kind, unit: d.kind === "count" || livestock ? unitFor(code) : undefined });
    onOpenChange(false);
  };
  const err = (on: boolean, text: string) => (tried && on ? <p className="mt-helper text-label font-medium text-danger">{text}</p> : null);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      kind="confirm"
      title={value ? f.item.edit : f.item.add}
      actions={
        <>
          {value && onRemove ? (
            <Button variant="danger" onClick={() => (onRemove(), onOpenChange(false))}>
              {f.item.remove}
            </Button>
          ) : null}
          <Button className="w-full sm:w-auto" onClick={save}>
            {value ? f.item.update : f.item.save}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-ink">{f.item.what}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {list.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={d.goods === g.id}
            onClick={() => setD({ ...d, goods: g.id, kind: g.code === "livestock" ? "count" : d.kind })}
            className={cn("h-10 rounded-pill border px-4 text-body-sm", d.goods === g.id ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}
          >
            {g.name}
          </button>
        ))}
        <button type="button" onClick={() => setAll((v) => !v)} className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-line bg-surface px-4 text-body-sm text-ink">
          <Search aria-hidden className="size-4" strokeWidth={1.8} />
          {all ? f.item.fewer : f.item.more}
        </button>
      </div>
      {err(errors.goods, f.item.errors.goods)}

      <label className="mt-5 block">
        <span className={label}>{f.item.describe}</span>
        <input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder={f.item.describePlaceholder} maxLength={120} className={fieldCls} />
      </label>
      {err(errors.describe, f.item.errors.describe)}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-body-sm text-ink">{f.item.howMuch}</span>
        {livestock ? null : (
          <div role="radiogroup" aria-label={f.item.howMuch} className="flex rounded-pill bg-seg p-1">
            {(["tonnes", "count"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={d.kind === k}
                onClick={() => setD({ ...d, kind: k })}
                className={cn("h-9 rounded-pill px-5 text-body-sm", d.kind === k ? "bg-surface text-ink shadow-seg" : "text-ink-2")}
              >
                {k === "tonnes" ? f.item.tonnes : f.item.count}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex h-16 items-center gap-3 rounded-input border border-line-field bg-surface px-2">
        <button type="button" onClick={() => step(-1)} aria-label={f.item.less} className="grid size-12 shrink-0 place-items-center rounded-full bg-paper text-ink">
          <Minus aria-hidden className="size-5" strokeWidth={1.8} />
        </button>
        <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
          <span className="sr-only">{f.item.howMuch}</span>
          <input
            inputMode="numeric"
            value={d.amount}
            onChange={(e) => setD({ ...d, amount: e.target.value.replace(/\D/g, "").slice(0, 7) })}
            placeholder="0"
            className="tabular w-24 min-w-0 bg-transparent text-right text-title-1 text-ink outline-none"
          />
          <span className="text-body text-ink-3">{d.kind === "tonnes" && !livestock ? f.item.unitT : f.item.units[unitFor(code)]}</span>
        </label>
        <button type="button" onClick={() => step(1)} aria-label={f.item.moreAmount} className="grid size-12 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">
          <Plus aria-hidden className="size-5" strokeWidth={1.8} />
        </button>
      </div>
      {err(errors.amount, f.item.errors.amount)}
      {d.kind === "count" && !livestock ? (
        <label className="mt-3 block">
          <span className="mb-2 block text-label font-normal text-ink-2">{f.item.eachKg}</span>
          <input
            inputMode="numeric"
            value={d.unitWeightKg ?? ""}
            onChange={(e) => setD({ ...d, unitWeightKg: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || undefined })}
            className={cn(fieldCls, "h-12")}
          />
        </label>
      ) : null}
      <p className="mt-2.5 text-caption text-ink-3">{f.item.weightHint}</p>

      <label className="mt-5 block">
        <span className={label}>
          {f.item.value} <span className="font-medium text-ink-3">{f.item.valueNote}</span>
        </span>
        <span className="relative block">
          <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-body font-semibold text-ink">
            ₦
          </span>
          <input
            inputMode="numeric"
            value={d.valueNaira ? Number(d.valueNaira).toLocaleString("en-NG") : ""}
            onChange={(e) => setD({ ...d, valueNaira: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            className={cn(fieldCls, "pl-10")}
          />
        </span>
      </label>
      <p className="mt-2 text-caption text-ink-3">{f.item.valueHint}</p>
    </Sheet>
  );
}

export type Alternative = { key: string; title: string; sub: string; best?: boolean; apply: () => void };

/** P08c: the chosen day is full for this truck. The closest options, or another day. */
export function NoTruckSheet({ open, onOpenChange, title, text, options, onOther }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; text: string; options: Alternative[]; onOther: () => void }) {
  const [pick, setPick] = useState(0);
  const chosen = options[pick];
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      kind="confirm"
      title={title}
      description={text}
      actions={
        chosen ? (
          <Button className="w-full" onClick={() => (chosen.apply(), onOpenChange(false))}>
            {f.noTruck.useThis}
          </Button>
        ) : (
          <Button className="w-full" onClick={() => (onOther(), onOpenChange(false))}>
            {f.noTruck.chooseAnother}
          </Button>
        )
      }
    >
      <span aria-hidden className="-order-1 mb-2 grid size-14 place-items-center rounded-callout bg-warning-100 text-warning">
        <CalendarDays className="size-6" strokeWidth={1.8} />
      </span>
      {options.length ? (
        <div role="radiogroup" aria-label={title} className="flex flex-col gap-2.5">
          {options.map((o, i) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={pick === i}
              onClick={() => setPick(i)}
              className={cn("flex items-center gap-3.5 rounded-tile border bg-surface px-4 py-3.5 text-left", pick === i ? "border-2 border-green-700 bg-green-50/40 px-3.75 py-3.25" : "border-line")}
            >
              <span className={cn("size-6 shrink-0 rounded-full border-field", pick === i ? "border-[7px] border-green-700" : "border-line-strong")} />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                  {o.title}
                  {o.best ? <span className="rounded-pill bg-green-50 px-2 py-0.5 text-caption font-semibold text-green-700">{f.noTruck.bestMatch}</span> : null}
                </span>
                <span className="block text-meta text-ink-3">{o.sub}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-body text-ink-2">
          <MapPin aria-hidden className="size-4" />
          {f.noTruck.none}
        </p>
      )}
    </Sheet>
  );
}
