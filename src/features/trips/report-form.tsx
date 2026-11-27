"use client";

import { Camera, ChevronLeft, Shield } from "lucide-react";
import { useState } from "react";
import { Box } from "@/components/art/pieces";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// P14d Report a problem. UI built, backend Phase 5 (disputes): shown only in the /dev preview until then;
// sending does nothing here.

const r = messages.report;
const field = "h-14 w-full rounded-input border border-line-field bg-surface px-4 text-body text-ink outline-none focus:border-green-700 focus:shadow-focus";

export function ReportForm({ back, outOf, unit, unitValueKobo, sample }: { back: string; outOf: number; unit: string; unitValueKobo: number; sample?: { short: number; text: string } }) {
  const [kind, setKind] = useState(r.kinds[0]);
  const [short, setShort] = useState(String(sample?.short ?? ""));
  const [claim, setClaim] = useState(String(((sample?.short ?? 0) * unitValueKobo) / 100 || ""));
  const [text, setText] = useState(sample?.text ?? "");
  const amount = Number(claim.replace(/\D/g, "")) * 100;
  return (
    <div className="min-h-dvh bg-paper pb-36 lg:mx-auto lg:max-w-[560px] lg:pt-8">
      <header className="flex items-center gap-3 px-4 pt-3.5 lg:px-0">
        <a href={back} aria-label={messages.checkout.back} className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </a>
        <h1 className="text-title-2 text-ink">{r.title}</h1>
      </header>
      <div className="flex flex-col gap-5 px-5 pt-5 lg:px-0">
        <fieldset>
          <legend className="mb-2.5 text-body-sm font-semibold text-ink">{r.what}</legend>
          <div className="flex flex-wrap gap-2">
            {r.kinds.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("h-11 rounded-pill border px-4 text-body-sm font-semibold", kind === k ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}>
                {k}
              </button>
            ))}
          </div>
        </fieldset>
        {kind === r.kinds[0] ? (
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-2 text-body-sm font-semibold text-ink">
              {r.howMany}
              <input inputMode="numeric" value={short} onChange={(e) => (setShort(e.target.value), setClaim(String((Number(e.target.value) * unitValueKobo) / 100)))} className={field} />
            </label>
            <label className="flex flex-col gap-2 text-body-sm font-semibold text-ink">
              {r.outOf}
              <input readOnly value={`${outOf} ${unit}`} className={field} />
            </label>
          </div>
        ) : null}
        <label className="flex flex-col gap-2 text-body-sm font-semibold text-ink">
          {r.claim}
          <span className="relative">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-body text-ink">₦</span>
            <input inputMode="numeric" value={Number(claim) ? Number(claim).toLocaleString("en-NG") : claim} onChange={(e) => setClaim(e.target.value.replace(/\D/g, ""))} className={cn(field, "pl-9")} />
          </span>
          <span className="text-caption font-normal text-ink-3">{r.claimNote}</span>
        </label>
        <label className="flex flex-col gap-2 text-body-sm font-semibold text-ink">
          {r.more}
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-input border border-line-field bg-surface px-4 py-3.5 text-body font-normal text-ink outline-none focus:border-green-700" />
        </label>
        <div>
          <p className="mb-2.5 text-body-sm font-semibold text-ink">{r.photos}</p>
          <div className="flex gap-2.5">
            {sample ? (
              <span className="grid size-19 place-items-center rounded-tile bg-green-50">
                <svg aria-hidden viewBox="-80 -140 160 160" className="size-14">
                  <Box s={1} />
                </svg>
              </span>
            ) : null}
            <button type="button" className="flex size-19 flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-line-strong text-caption font-semibold text-ink-2">
              <Camera aria-hidden className="size-4.5" strokeWidth={1.8} />
              {r.add}
            </button>
          </div>
        </div>
        {amount > 0 ? (
          <p className="flex items-start gap-3 rounded-callout bg-warning-100 px-4 py-3.5 text-meta text-ink-2">
            <Shield aria-hidden className="mt-0.5 size-4.5 shrink-0 text-warning" strokeWidth={1.8} />
            {r.held.replace("{amount}", formatNaira(amount / 100))}
          </p>
        ) : null}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-5 pt-4 pb-[max(env(safe-area-inset-bottom),24px)] lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:px-0">
        <Button className="w-full">{r.send}</Button>
      </div>
    </div>
  );
}
