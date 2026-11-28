"use client";

import { AlertTriangle, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// X05 / X05b SOS (Phase 5 backend): sample data, /dev only. The sound plays until someone presses
// Acknowledge, and the 2-minute escalation counts down to the on-call super admin. Resolve needs an
// outcome and a note.

const OUTCOMES = ["Driver safe · no help needed", "Mechanic sent", "Police or emergency services called", "Pressed by mistake"];

function useAlarm(on: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!on) return;
    const beep = () => {
      try {
        ctx.current ??= new AudioContext();
        const osc = ctx.current.createOscillator();
        const gain = ctx.current.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(ctx.current.destination);
        osc.start();
        osc.stop(ctx.current.currentTime + 0.35);
      } catch {
        // Browsers block sound until the page is touched once; the red card still shows.
      }
    };
    beep();
    const timer = window.setInterval(beep, 1200);
    return () => window.clearInterval(timer);
  }, [on]);
}

export function SosPreview() {
  const [acked, setAcked] = useState(false);
  const [left, setLeft] = useState(58);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [note, setNote] = useState("");
  useAlarm(!acked && !resolved);
  useEffect(() => {
    if (acked) return;
    const timer = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [acked]);
  const facts = [
    ["Driver", "+234 802 117 3309"],
    ["Owner", "Same person"],
    ["Emergency contact", "Ngozi Nwosu · +234 805 902 1180"],
    ["Location", "Bida–Abuja road, 18 km east of Bida"],
    ["Updated", "5 s ago · moving 0 km/h"],
    ["Risky stretch", "Yes · after dark"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-4 text-body text-ink-2">Answer within two minutes, every time. Sound plays until someone acknowledges.</p>
      {resolved ? (
        <p className="rounded-card border border-line bg-surface p-5 text-body text-ink">Resolved: {outcome}. It&apos;s in the audit log.</p>
      ) : (
        <section className="overflow-hidden rounded-card border-2 border-sos bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-sos px-5 py-3 text-white">
            <p className="flex items-center gap-2 text-body font-semibold">
              <AlertTriangle aria-hidden className="size-5" strokeWidth={2} />
              SOS pressed 15:01 · {acked ? "acknowledged by Kemi" : "not acknowledged"}
            </p>
            {acked ? null : <p className="tabular text-body-sm">To the on-call super admin in 0:{String(left).padStart(2, "0")}</p>}
          </div>
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="text-title-2 text-ink">Emeka Nwosu</h2>
              <p className="text-body text-ink-2">FA-6M2T4 · Lagos → Abuja · AGL 551 KT · Emeka Nwosu Transport (drives his own truck)</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-meta text-ink-3">{k}</dt>
                    <dd className="text-body font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button className={cn(acked && "opacity-60")} disabled={acked} onClick={() => setAcked(true)}>
                Acknowledge
              </Button>
              <a href="tel:+2348021173309" className="inline-flex h-12 items-center justify-center gap-2 rounded-button border border-line bg-surface text-body font-semibold text-ink">
                <Phone aria-hidden className="size-4.5" strokeWidth={1.8} />
                Call driver
              </a>
              <Button variant="secondary" onClick={() => setResolving(true)}>
                Resolve
              </Button>
            </div>
          </div>
        </section>
      )}
      <Dialog
        open={resolving}
        onOpenChange={setResolving}
        title="Resolve SOS on FA-6M2T4"
        description="This closes the alert. The trip carries on unless you change it."
        actions={
          <>
            <Button variant="secondary" onClick={() => setResolving(false)}>
              Cancel
            </Button>
            <Button disabled={note.trim().length < 5} onClick={() => (setResolved(true), setResolving(false))}>
              Resolve
            </Button>
          </>
        }
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-label text-ink">Outcome</legend>
          {OUTCOMES.map((o) => (
            <label key={o} className="flex items-center gap-2.5 text-body text-ink">
              <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} />
              {o}
            </label>
          ))}
        </fieldset>
        <label className="mt-3 block text-label text-ink">
          Note (saved to the audit log)
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5 w-full rounded-input border border-line-field px-3 py-2.5 text-control" />
        </label>
      </Dialog>
    </div>
  );
}
