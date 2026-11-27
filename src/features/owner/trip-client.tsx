"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { changeTripDriver } from "./actions";

const t = messages.ownerTrip;

/** O15b Change driver: before loading, to another active driver of the business (change_trip_driver). */
export function ChangeDriver({ tripId, current, drivers, allowed }: { tripId: string; current: string | null; drivers: { id: string; name: string }[]; allowed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(drivers.find((d) => d.id !== current)?.id ?? "");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await changeTripDriver(tripId, pick, reason);
      if (r.status !== "ok") return void toast.error(r.status === "late" ? t.late : messages.checkout.error);
      setOpen(false);
      toast(t.changed);
      router.refresh();
    });
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={t.changeTitle}
      description={t.changeText}
      trigger={
        <Button variant="secondary" size="md" className="w-full" disabled={!allowed || drivers.length < 2}>
          {t.change}
        </Button>
      }
      actions={
        <Button className="w-full" loading={pending} disabled={!pick || pick === current} onClick={save}>
          {t.save}
        </Button>
      }
    >
      <ul role="radiogroup" aria-label={t.changeTitle} className="flex flex-col gap-2">
        {drivers.map((d) => {
          const on = pick === d.id;
          return (
            <li key={d.id}>
              <button type="button" role="radio" aria-checked={on} onClick={() => setPick(d.id)} className={cn("flex w-full items-center gap-3 rounded-card border bg-surface p-3.5 text-left", on ? "border-2 border-green-900" : "border-line")}>
                <Avatar name={d.name} size={40} />
                <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{d.name}</span>
                {d.id === current ? <span className="text-meta text-ink-3">{t.current}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <label className="mt-3 flex flex-col gap-1.5 text-body-sm font-semibold text-ink">
        {t.reason}
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className="h-13 rounded-input border border-line-field bg-surface px-4 text-body font-normal outline-none focus:border-green-700" />
      </label>
    </Sheet>
  );
}
