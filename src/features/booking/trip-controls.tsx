"use client";

import { Check, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, useWideScreen } from "@/components/ui/sheet";
import messages from "@/messages/en.json";
import {
  acceptCounter,
  cancelLoad,
  confirmDemoPayment,
  declineCounter,
  startPayment,
  tripStep,
} from "./actions";

const t = messages.trips;

function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => setDone(true))
      }
      className="inline-flex min-h-11 items-center gap-1.5 px-2 text-label font-semibold text-green-700"
    >
      {done ? (
        <Check aria-hidden className="size-4" strokeWidth={2} />
      ) : (
        <Copy aria-hidden className="size-4" strokeWidth={1.75} />
      )}
      {done ? t.pay.copied : t.pay.copy}
    </button>
  );
}

/** S-05 Pay: get a one-time account, then (demo) confirm the transfer. */
export function PayPanel({
  loadId,
  payment,
  amountLabel,
  demo,
}: {
  loadId: string;
  payment: {
    id: string;
    account: string | null;
    bank: string | null;
    amount: string;
    due: string | null;
    expires: string;
    provider: string | null;
  } | null;
  amountLabel: string;
  demo: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!payment?.account) {
    return (
      <Button
        className="w-full"
        loading={pending}
        loadingText
        loadingLabel={t.pay.starting}
        onClick={() =>
          start(async () => {
            const result = await startPayment(loadId);
            if (result.status === "noProvider") toast(t.pay.noProvider);
            else if (result.status === "error")
              toast.error(messages.booking.errors.failed);
            router.refresh();
          })
        }
      >
        {t.pay.start.replace("{amount}", amountLabel)}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 rounded-inner bg-paper p-4 text-body-sm">
        <dt className="text-ink-2">{t.pay.account}</dt>
        <dd className="flex items-center justify-between gap-2">
          <span className="tabular text-title-3 font-extrabold tracking-[0.06em] text-ink">
            {payment.account}
          </span>
          <CopyText text={payment.account} />
        </dd>
        <dt className="text-ink-2">{t.pay.bank}</dt>
        <dd className="truncate font-semibold text-ink">{payment.bank}</dd>
        <dt className="text-ink-2">{t.pay.amount}</dt>
        <dd className="tabular font-extrabold text-green-900">
          {payment.amount}
        </dd>
      </dl>
      {payment.due ? (
        <p className="text-label font-semibold text-warning">
          {t.pay.partial.replace("{amount}", payment.due)}
        </p>
      ) : null}
      <p className="text-label font-normal text-ink-2">
        {t.pay.expires.replace("{time}", payment.expires)}
      </p>
      {demo && payment.provider === "demo" ? (
        <>
          <Button
            variant="secondary"
            className="w-full"
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await confirmDemoPayment(payment.id);
                if (result.status === "error")
                  toast.error(messages.booking.errors.failed);
                router.refresh();
              })
            }
          >
            {t.pay.demoPaid}
          </Button>
          <p className="text-caption text-ink-3">{t.pay.demoNote}</p>
        </>
      ) : null}
    </div>
  );
}

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
      <h2 className="text-body font-bold text-ink">{t.counter.title}</h2>
      <p className="text-body-sm text-ink-2">{text}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="md"
          loading={pending}
          onClick={() =>
            start(async () => {
              await acceptCounter(offerId, loadId);
              router.refresh();
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
              await declineCounter(offerId, loadId);
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
}: {
  loadId: string;
  atPickup: boolean;
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
          className="self-start text-danger"
        >
          {t.cancel.button}
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
