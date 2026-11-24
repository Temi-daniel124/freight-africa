"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldShell, inputClasses, TextField } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { takeLoad } from "./actions";

const t = messages.loads;
const naira = (kobo: number) => formatNaira(kobo / 100);

type Load = {
  id: string;
  ref: string;
  from: string;
  to: string;
  goods: string;
  weightKg: number | null;
  quantity: number | null;
  unit: string | null;
  truckType: string;
  truckTypeId: string;
  pickup: string;
  freight: number;
  payout: number;
  band: string;
};
type Truck = {
  id: string;
  plate: string;
  capacity: number;
  typeId: string;
  driver: string | null;
};
type Driver = { id: string; name: string };

function amount(l: Load) {
  if (l.unit === "head") return `${l.quantity} head`;
  if (l.weightKg) return `${l.weightKg / 1000} t`;
  return l.quantity ? `about ${l.quantity} ${l.unit}` : "";
}

/** T-04 load board and T-05/T-06 accept or counter, in the shared sheet (a right panel on desktop). */
export function LoadBoardList({
  loads,
  trucks,
  drivers,
}: {
  loads: Load[];
  trucks: Truck[];
  drivers: Driver[];
}) {
  return (
    <ul className="mx-auto flex w-full max-w-[880px] flex-col gap-3">
      {loads.map((l) => (
        <li
          key={l.id}
          className="rounded-tile bg-surface p-4.5 shadow-raised lg:rounded-card lg:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-body font-extrabold whitespace-nowrap text-ink">
                {l.from} → {l.to}
              </p>
              <p className="truncate text-body-sm text-ink-2">
                {[l.goods, amount(l), l.truckType].filter(Boolean).join(" · ")}
              </p>
              <p className="text-caption text-ink-3">
                {l.pickup} · {t.value.replace("{band}", l.band)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tabular text-body-lg font-extrabold text-green-900">
                {naira(l.payout)}
              </p>
              <p className="text-caption text-ink-3">{t.after}</p>
            </div>
          </div>
          <TakeSheet
            load={l}
            trucks={trucks.filter(
              (x) => !l.weightKg || x.capacity >= l.weightKg,
            )}
            drivers={drivers}
          />
        </li>
      ))}
    </ul>
  );
}

function TakeSheet({
  load,
  trucks,
  drivers,
}: {
  load: Load;
  trucks: Truck[];
  drivers: Driver[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [truck, setTruck] = useState(trucks[0]?.id ?? "");
  const [driver, setDriver] = useState(
    trucks[0]?.driver ?? drivers[0]?.id ?? "",
  );
  const [counter, setCounter] = useState("");
  const [mode, setMode] = useState<"accept" | "counter">("accept");
  const [pending, start] = useTransition();
  const go = () =>
    start(async () => {
      const result = await takeLoad(
        load.id,
        truck,
        driver || null,
        mode === "counter" ? Number(counter.replace(/[^\d]/g, "")) : undefined,
      );
      const say: Record<string, string> = {
        taken: t.taken,
        heavy: t.heavy,
        truck: t.truckBad,
        range: t.range,
        countered: t.countered,
        ok: t.accepted,
        error: messages.booking.errors.failed,
      };
      if (result.status === "ok" || result.status === "countered")
        toast.success(say[result.status]);
      else toast.error(say[result.status] ?? say.error);
      setOpen(false);
      if (result.tripId) router.push(`/app/haul/trips/${result.tripId}`);
      else router.refresh();
    });
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={`${load.from} → ${load.to}`}
      description={t.pays.replace("{amount}", naira(load.payout))}
      trigger={
        <Button size="md" className="mt-4 w-full">
          {t.take.replace("{amount}", naira(load.freight))}
        </Button>
      }
      actions={
        <Button
          onClick={go}
          loading={pending}
          disabled={!truck}
          className="w-full"
        >
          {mode === "counter"
            ? t.sendCounter
            : t.take.replace("{amount}", naira(load.freight))}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldShell id={`truck-${load.id}`} label={t.pickTruck}>
          <select
            id={`truck-${load.id}`}
            value={truck}
            onChange={(e) => setTruck(e.target.value)}
            className={cn(inputClasses, "appearance-auto")}
          >
            {trucks.map((x) => (
              <option key={x.id} value={x.id}>
                {x.plate} · {x.capacity / 1000} t
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell id={`driver-${load.id}`} label={t.pickDriver}>
          <select
            id={`driver-${load.id}`}
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            className={cn(inputClasses, "appearance-auto")}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FieldShell>
        {mode === "counter" ? (
          <TextField
            id={`counter-${load.id}`}
            label={t.counterLabel}
            helper={t.counterHelp}
            inputMode="numeric"
            value={counter}
            onChange={(e) => setCounter(e.target.value)}
          />
        ) : (
          <Button
            variant="tertiary"
            size="text"
            className="self-start"
            onClick={() => setMode("counter")}
          >
            {t.other}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
