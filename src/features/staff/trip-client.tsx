"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import messages from "@/messages/en.json";
import { staffTripAction, staffTripNote } from "./trip-actions";

const t = messages.staffTrips;
type Step = "loaded" | "delivered" | "release";
const NEXT: Record<string, Step[]> = {
  assigned: ["loaded"],
  to_pickup: ["loaded"],
  at_pickup: ["loaded"],
  loading: ["loaded"],
  loaded: ["delivered"],
  in_transit: ["delivered"],
  arrived: ["delivered"],
  delivered: ["release"],
};

/** X03b Take action: the effect in one sentence, a required reason (to the audit log), Confirm. */
export function TakeAction({ tripId, status }: { tripId: string; status: string }) {
  const router = useRouter();
  const steps = NEXT[status] ?? [];
  const [step, setStep] = useState<Step | null>(null);
  const [reason, setReason] = useState("");
  const [weight, setWeight] = useState("");
  const [count, setCount] = useState("");
  const [pending, start] = useTransition();
  if (!steps.length) return null;
  const confirm = () =>
    start(async () => {
      if (!step) return;
      const r = await staffTripAction(tripId, step, reason, step === "loaded" ? Number(weight) || undefined : undefined, step === "loaded" ? Number(count) || undefined : undefined);
      if (r.status === "ok") {
        toast.success(t.done);
        setStep(null);
        setReason("");
        router.refresh();
      } else toast.error(r.status === "wait" ? t.wait : r.status === "reason" ? t.reasonHint : t.failed);
    });
  return (
    <>
      <details className="relative">
        <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-pill bg-green-900 px-5 text-body-sm font-semibold text-white">
          <ChevronDown aria-hidden className="size-4" strokeWidth={2} />
          {t.action}
        </summary>
        <div className="absolute right-0 z-10 mt-2 w-60 rounded-callout border border-line bg-surface p-1.5 shadow-floating">
          {steps.map((s) => (
            <button key={s} type="button" onClick={() => setStep(s)} className="block w-full rounded-nav-dense px-3 py-2.5 text-left text-body-sm font-semibold text-ink hover:bg-paper">
              {t.steps[s]}
            </button>
          ))}
        </div>
      </details>
      <Dialog
        open={step !== null}
        onOpenChange={(o) => (o ? null : setStep(null))}
        title={step ? t.steps[step] : ""}
        description={step ? t.effects[step] : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => setStep(null)}>
              {t.cancel}
            </Button>
            <Button loading={pending} disabled={reason.trim().length < 5} onClick={confirm}>
              {t.confirm}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {step === "loaded" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-label text-ink">
                {t.weight}
                <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1.5 h-12 w-full rounded-input border border-line-field px-3 text-control" />
              </label>
              <label className="text-label text-ink">
                {t.quantity}
                <input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className="mt-1.5 h-12 w-full rounded-input border border-line-field px-3 text-control" />
              </label>
            </div>
          ) : null}
          <label htmlFor="staff-reason" className="text-label text-ink">
            {t.reason}
          </label>
          <textarea id="staff-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-input border border-line-field px-3 py-2.5 text-control outline-none focus:border-green-700" />
          <p className="text-caption text-ink-3">{t.reasonHint}</p>
        </div>
      </Dialog>
    </>
  );
}

export function NoteForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await staffTripNote(tripId, note);
      if (r.status === "ok") {
        setNote("");
        router.refresh();
      } else toast.error(t.failed);
    });
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="trip-note" className="sr-only">
        {t.addNote}
      </label>
      <textarea id="trip-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} className="w-full rounded-input border border-line-field bg-surface px-3 py-2.5 text-body-sm outline-none focus:border-green-700" />
      <Button variant="secondary" size="sm" loading={pending} disabled={note.trim().length < 2} onClick={save}>
        {t.noteSave}
      </Button>
    </div>
  );
}
