"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { fillPercent, TruckGraphic, truckKind } from "@/components/art/truck";
import { Button } from "@/components/ui/button";
import { FieldShell, inputClasses, TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { createLoad, quoteFor } from "./actions";

const t = messages.booking;

type Option = { id: string; name: string };
type TruckType = Option & { code: string; capacity: number };
type Goods = Option & { code: string };
type Props = {
  orgId: string;
  cities: Option[];
  truckTypes: TruckType[];
  goods: Goods[];
  defaultFrom?: string;
};

const UNITS = ["bags", "cartons", "pieces", "drums", "tonnes"] as const;

function localInput(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

/** S-02 Post a load: route, goods and amount (D046), truck, loading time, value. Six questions, one screen. */
export function BookForm({
  orgId,
  cities,
  truckTypes,
  goods,
  defaultFrom,
}: Props) {
  const router = useRouter();
  const tomorrow = useMemo(() => {
    const d = new Date(Date.now() + 24 * 3600_000);
    d.setHours(8, 0, 0, 0);
    return d;
  }, []);
  const [from, setFrom] = useState(defaultFrom ?? cities[0]?.id ?? "");
  const [to, setTo] = useState(
    cities.find((c) => c.id !== (defaultFrom ?? cities[0]?.id))?.id ?? "",
  );
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [receiver, setReceiver] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [goodsId, setGoodsId] = useState(goods[0]?.id ?? "");
  const livestock = goods.find((g) => g.id === goodsId)?.code === "livestock";
  const [truckType, setTruckType] = useState(truckTypes[0]?.id ?? "");
  const [weight, setWeight] = useState("");
  const [known, setKnown] = useState<"known" | "notSure">("known");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("bags");
  const [day, setDay] = useState(localInput(tomorrow));
  const [value, setValue] = useState("");
  const [quote, setQuote] = useState<
    { freight: number; fee: number; total: number } | null | "none"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const type = truckTypes.find((x) => x.id === truckType);

  // Livestock goes in a livestock truck.
  useEffect(() => {
    if (livestock) {
      const cattle = truckTypes.find((x) => x.code === "livestock");
      if (cattle && cattle.id !== truckType) setTruckType(cattle.id);
    }
  }, [livestock, truckType, truckTypes]);

  useEffect(() => {
    if (!from || !to || from === to || !truckType) return;
    let gone = false;
    void quoteFor(orgId, from, to, truckType).then((q) => {
      if (!gone) setQuote(q ?? "none");
    });
    return () => {
      gone = true;
    };
  }, [orgId, from, to, truckType]);

  const tonnes = Number(weight);
  const preview = livestock
    ? {
        kind: "livestock" as const,
        text: quantity
          ? `${goods.find((g) => g.id === goodsId)?.name.split(",")[0]} · ${quantity} head`
          : t.howManyAnimals,
      }
    : known === "known" && tonnes > 0 && type
      ? {
          kind: "weight" as const,
          percent: fillPercent(tonnes * 1000, type.capacity),
          line: `${tonnes} t of ${type.capacity / 1000} t`,
        }
      : {
          kind: "amount" as const,
          goods: goods.find((g) => g.id === goodsId)?.name ?? "",
          amount: quantity ? `about ${quantity} ${unit}` : undefined,
        };

  const submit = () =>
    start(async () => {
      setError(null);
      const startAt = new Date(day);
      const result = await createLoad({
        org: orgId,
        goods: goodsId,
        truckType,
        weightTonnes:
          !livestock && known === "known" && tonnes > 0 ? tonnes : undefined,
        notSure: !livestock && known === "notSure",
        quantity: quantity ? Number(quantity) : undefined,
        quantityUnit: livestock ? "head" : unit,
        livestock,
        value: Number(value.replace(/[^\d.]/g, "")) || 0,
        pickupFrom: startAt.toISOString(),
        pickupUntil: new Date(startAt.getTime() + 8 * 3600_000).toISOString(),
        stops: [
          { city: from, address: pickup },
          { city: to, address: dropoff, name: receiver, phone: receiverPhone },
        ],
      });
      if (result.status === "ok") router.push(`/app/ship/trips/${result.id}`);
      else if (result.status === "route") setError(t.errors.route);
      else if (result.status === "invalid")
        setError(
          t.errors[result.field as keyof typeof t.errors] ?? t.errors.form,
        );
      else setError(result.message ?? t.errors.failed);
    });

  const select = (
    id: string,
    label: string,
    val: string,
    set: (v: string) => void,
    options: Option[],
  ) => (
    <FieldShell id={id} label={label}>
      <select
        id={id}
        value={val}
        onChange={(e) => set(e.target.value)}
        className={cn(inputClasses, "appearance-auto")}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </FieldShell>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-5 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-7">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-title-3 text-ink">{t.route}</legend>
          {select("book-from", t.from, from, setFrom, cities)}
          {select(
            "book-to",
            t.to,
            to,
            setTo,
            cities.filter((c) => c.id !== from),
          )}
          <TextField
            id="book-pickup"
            label={t.pickupAddress}
            placeholder="Apapa port, Lagos"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
          />
          <TextField
            id="book-dropoff"
            label={t.dropoffAddress}
            placeholder="Dawanau market, Kano"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
          />
          <TextField
            id="book-receiver"
            label={t.receiver}
            placeholder="Musa Danladi"
            autoComplete="off"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <TextField
            id="book-receiver-phone"
            label={t.receiverPhone}
            placeholder="0803 123 4567"
            inputMode="tel"
            value={receiverPhone}
            onChange={(e) => setReceiverPhone(e.target.value)}
          />
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-title-3 text-ink">{t.goods}</legend>
          {select("book-goods", t.whatGoods, goodsId, setGoodsId, goods)}
          {select("book-truck", t.truck, truckType, setTruckType, truckTypes)}
          {livestock ? (
            <TextField
              id="book-head"
              label={t.howManyAnimals}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
            />
          ) : (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-label text-ink">{t.weight}</span>
              <SegmentedControl
                label={t.weight}
                value={known}
                onChange={setKnown}
                options={[
                  { value: "known", label: t.inTonnes },
                  { value: "notSure", label: t.notSure },
                ]}
              />
              {known === "known" ? (
                <TextField
                  id="book-weight"
                  label={t.tonnes}
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) =>
                    setWeight(e.target.value.replace(/[^\d.]/g, ""))
                  }
                />
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                  <TextField
                    id="book-qty"
                    label={t.roughly}
                    helper={t.optional}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <FieldShell id="book-unit" label={t.unit}>
                    <select
                      id="book-unit"
                      value={unit}
                      onChange={(e) =>
                        setUnit(e.target.value as (typeof UNITS)[number])
                      }
                      className={cn(inputClasses, "appearance-auto")}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {t.units[u]}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                </div>
              )}
            </div>
          )}
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-title-3 text-ink">{t.when}</legend>
          <TextField
            id="book-day"
            type="datetime-local"
            label={t.loadingFrom}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <TextField
            id="book-value"
            label={t.value}
            helper={t.valueHelp}
            inputMode="numeric"
            placeholder="₦5,000,000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </fieldset>
      </div>
      <aside className="flex flex-col gap-4 self-start rounded-tile bg-surface p-5 shadow-raised lg:sticky lg:top-24 lg:rounded-card">
        <TruckGraphic kind={truckKind(type?.code ?? "")} load={preview} />
        <dl className="flex flex-col gap-2 text-body-sm">
          {quote && quote !== "none" ? (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">{t.freight}</dt>
                <dd className="tabular font-semibold text-ink">
                  {formatNaira(quote.freight / 100)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-2">{t.fee}</dt>
                <dd className="tabular font-semibold text-ink">
                  {quote.fee ? formatNaira(quote.fee / 100) : t.free}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-body">
                <dt className="font-semibold text-ink">{t.total}</dt>
                <dd className="tabular font-semibold text-green-900">
                  {formatNaira(quote.total / 100)}
                </dd>
              </div>
            </>
          ) : quote === "none" ? (
            <p className="text-ink-2">{t.errors.route}</p>
          ) : (
            <p className="text-ink-3">{t.pricing}</p>
          )}
        </dl>
        <p className="text-label font-normal text-ink-2">{t.heldNote}</p>
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-label font-medium text-danger"
          >
            <TriangleAlert
              aria-hidden
              className="mt-px size-4 shrink-0"
              strokeWidth={1.75}
            />
            {error}
          </p>
        ) : null}
        <Button
          onClick={submit}
          loading={pending}
          loadingText
          loadingLabel={t.saving}
          className="w-full"
          disabled={quote === "none"}
        >
          {t.submit}
          <ArrowRight aria-hidden className="size-4.5" strokeWidth={1.75} />
        </Button>
      </aside>
    </div>
  );
}
