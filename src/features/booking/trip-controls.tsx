"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, useWideScreen } from "@/components/ui/sheet";
import messages from "@/messages/en.json";
import { acceptReply, declineReply } from "@/features/checkout/actions";
import { checkoutMessage } from "@/features/checkout/screens";
import { cancelLoad, tripStep } from "./actions";

const t = messages.trips;

export function CounterCard({
  offerId,
  loadId,
  text,
}: {
  offerId: string;
  loadId: string;
  text: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section className="flex flex-col gap-3 rounded-tile border border-warning/30 bg-warning-100 p-4">
      <h2 className="text-body font-semibold text-ink">{t.counter.title}</h2>
      <p className="text-body-sm text-ink-2">{text}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="md"
          loading={pending}
          onClick={() =>
            start(async () => {
              const result = await acceptReply(offerId);
              if (result.status === "ok") window.location.assign(result.url);
              else toast.error(checkoutMessage(result));
            })
          }
        >
          {t.counter.accept}
        </Button>
        <Button
          size="md"
          variant="secondary"
          onClick={() =>
            start(async () => {
              await declineReply(offerId, loadId);
              router.refresh();
            })
          }
        >
          {t.counter.decline}
        </Button>
      </div>
    </section>
  );
}

/** Cancel (SYSTEM-LOGIC §4.4): a small confirmation saying what comes back. */
export function CancelButton({
  loadId,
  atPickup,
  label,
  className,
}: {
  loadId: string;
  atPickup: boolean;
  /** P11 "Cancel and get a full refund": the same confirmation with the mockup's words. */
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const wide = useWideScreen();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Sheet
      kind="confirm"
      open={open}
      onOpenChange={setOpen}
      title={t.cancel.title}
      description={atPickup ? t.cancel.atPickup : t.cancel.before}
      trigger={
        <Button
          variant="tertiary"
          size="text"
          className={className ?? "self-start text-danger"}
        >
          {label ?? t.cancel.button}
        </Button>
      }
      actions={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setOpen(false)}
            className={wide ? "" : "w-full"}
          >
            {t.cancel.keep}
          </Button>
          <Button
            variant="destructive"
            size="md"
            loading={pending}
            className={wide ? "" : "w-full"}
            onClick={() =>
              start(async () => {
                const result = await cancelLoad(loadId, "");
                if (result.status === "afterLoading")
                  toast(t.cancel.afterLoading);
                else if (result.status === "error")
                  toast.error(messages.booking.errors.failed);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {t.cancel.confirm}
          </Button>
        </>
      }
    >
      {null}
    </Sheet>
  );
}

/** D039 demo and operations: move the trip on until Phase 4's codes do it. */
export function DemoTripSteps({
  tripId,
  status,
}: {
  tripId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const step = ["assigned", "to_pickup", "at_pickup", "loading"].includes(
    status,
  )
    ? "loaded"
    : ["loaded", "in_transit", "arrived"].includes(status)
      ? "delivered"
      : status === "delivered"
        ? "release"
        : null;
  if (!step) return null;
  return (
    <section className="flex flex-col gap-2 rounded-tile border border-dashed border-line-strong p-4">
      <p className="text-label font-semibold text-ink-2">{t.demoSteps}</p>
      <Button
        variant="secondary"
        size="md"
        loading={pending}
        onClick={() =>
          start(async () => {
            const result = await tripStep(tripId, step);
            if (result.status === "error")
              toast.error(messages.booking.errors.failed);
            router.refresh();
          })
        }
      >
        {t[step]}
      </Button>
    </section>
  );
}
