"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldShell, inputClasses } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { assignDriver, pauseTruck } from "./detail-actions";

const t = messages.truckDetail;

/** Truck detail actions: Assign driver (in the shared sheet) and Pause truck. */
export function TruckControls({
  truckId,
  paused,
  onTrip,
  drivers,
}: {
  truckId: string;
  paused: boolean;
  onTrip: boolean;
  drivers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [driver, setDriver] = useState(drivers[0]?.id ?? "");
  return (
    <div className="flex flex-wrap gap-2">
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t.assign}
        trigger={
          <Button size="md" variant="secondary">
            {t.assign}
          </Button>
        }
        actions={
          <Button
            className="w-full"
            loading={pending}
            disabled={!driver}
            onClick={() =>
              start(async () => {
                const ok = await assignDriver(truckId, driver);
                if (!ok) toast.error(messages.booking.errors.failed);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {t.assignSave}
          </Button>
        }
      >
        <FieldShell id={`assign-${truckId}`} label={messages.loads.pickDriver}>
          <select
            id={`assign-${truckId}`}
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
      </Sheet>
      {onTrip ? null : (
        <Button
          size="md"
          variant="tertiary"
          loading={pending}
          onClick={() =>
            start(async () => {
              const ok = await pauseTruck(truckId, !paused);
              if (!ok) toast.error(messages.booking.errors.failed);
              router.refresh();
            })
          }
        >
          {paused ? t.resume : t.pause}
        </Button>
      )}
    </div>
  );
}
