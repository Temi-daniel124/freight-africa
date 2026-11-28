"use client";

import { Camera, Check, ChevronLeft, CircleCheck, Clock, FileText, MapPin, Mic, Package, Phone, ShieldCheck, Smartphone, Truck, UserRound } from "lucide-react";
import { useState } from "react";
import { SuccessCheck } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// Driver screens whose server side is later (Phase 4 trip steps, Phase 5 problems) or that a demo driver who
// has finished joining can't reach (DV01–DV04, DV08), drawn with the mockups' sample trip for /dev/driver.
// No money anywhere (D003); the driver never holds a code.

const t = messages.driverScreens;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export const SAMPLE = {
  owner: "Musa Haulage Ltd",
  ownerShort: "Musa Haulage",
  ownerPerson: "Musa Danladi",
  driver: "Sani Bello",
  first: "Sani",
  phone: "+234 806 555 0123",
  plate: "KAN 219 BT",
  truck: "covered 30 t",
  day: "Fri 27 Nov, morning",
  window: "6 am to 12 pm",
  from: "Ikeja, Lagos",
  fromPlace: "Okafor Foods depot",
  to: "Sabon Gari, Kano",
  load: "Cartons of drinks · 28 t · 1,400",
  note: "Keep cartons dry. Stack no more than 6 high.",
  receiver: "Ibrahim",
  seal: "00512",
};

const BIG = "h-17 w-full rounded-button text-[18px] font-semibold";
const Primary = ({ children }: { children: React.ReactNode }) => <button type="button" className={cn(BIG, "bg-green-900 text-white")}>{children}</button>;
const Secondary = ({ children, danger }: { children: React.ReactNode; danger?: boolean }) => (
  <button type="button" className={cn(BIG, "border border-line bg-surface", danger ? "text-danger" : "text-ink")}>
    {children}
  </button>
);

function Frame({ children, step }: { children: React.ReactNode; step?: number }) {
  return (
    <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-5">
      {step ? (
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full border border-line bg-surface">
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
          </span>
          <span className="text-meta font-semibold text-ink-3">{fill(t.welcome.step, { n: step })}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: { icon: typeof Truck; title: string; sub?: string; end?: React.ReactNode }[] }) {
  return (
    <ul className="rounded-card border border-line bg-surface px-4">
      {rows.map((r) => (
        <li key={r.title} className="flex items-center gap-3 border-line-soft py-3.5 not-first:border-t">
          <span className="grid size-10 shrink-0 place-items-center rounded-icon bg-green-50 text-green-700">
            <r.icon aria-hidden className="size-4.5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold text-ink">{r.title}</span>
            {r.sub ? <span className="block text-meta text-ink-3">{r.sub}</span> : null}
          </span>
          {r.end}
        </li>
      ))}
    </ul>
  );
}

/** DV01: the owner's invite link. */
export function DriverInvite() {
  return (
    <Frame>
      <div className="mt-6 flex flex-col items-center text-center">
        <span className="grid size-18 place-items-center rounded-[22px] bg-green-900 text-title-2 font-semibold text-white">MH</span>
        <p className="mt-5 text-meta font-semibold tracking-caps text-ink-3 uppercase">{fill(t.invite.eyebrow, { owner: SAMPLE.owner })}</p>
        <h1 className="mt-2 text-[28px] leading-tight font-semibold text-ink">{fill(t.invite.title, { person: SAMPLE.ownerPerson })}</h1>
        <p className="mt-2 text-[17px] text-ink-2">{fill(t.invite.text, { plate: SAMPLE.plate, truck: SAMPLE.truck })}</p>
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <Primary>{fill(t.invite.join, { owner: SAMPLE.ownerShort })}</Primary>
        <p className="text-center text-meta text-ink-3">{t.invite.valid}</p>
        <p className="text-center text-meta text-ink-3">{fill(t.invite.phone, { phone: SAMPLE.phone })}</p>
      </div>
    </Frame>
  );
}

/** DV02: welcome and the four joining steps. */
export function DriverWelcome() {
  return (
    <Frame step={1}>
      <h1 className="text-[28px] leading-tight font-semibold text-ink">{fill(t.welcome.title, { name: SAMPLE.first })}</h1>
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
        <span className="grid size-11 place-items-center rounded-icon bg-green-900 text-body-sm font-semibold text-white">MH</span>
        <span className="text-[17px] font-semibold text-ink">{fill(t.welcome.drive, { owner: SAMPLE.owner })}</span>
      </div>
      <label className="flex flex-col gap-2 text-body-sm font-semibold text-ink">
        {t.welcome.name}
        <input readOnly value={SAMPLE.driver} className="h-14 rounded-input border border-line-field bg-surface px-4 text-[17px] text-ink" />
      </label>
      <ol className="flex flex-col gap-2">
        {t.welcome.steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[17px] text-ink">
            <span className="grid size-7 place-items-center rounded-full border border-line-strong text-meta font-semibold text-ink-3">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-auto">
        <Primary>{t.welcome.start}</Primary>
      </div>
    </Frame>
  );
}

/** DV03: identity check (no NIN for drivers). */
export function DriverId() {
  return (
    <Frame step={1}>
      <h1 className="text-[28px] leading-tight font-semibold text-ink">{t.id.title}</h1>
      <p className="text-[17px] text-ink-2">{t.id.lead}</p>
      <Rows rows={[{ icon: FileText, title: t.id.steps[0] }, { icon: UserRound, title: t.id.steps[1] }]} />
      <div className="mt-auto">
        <Primary>{t.id.start}</Primary>
      </div>
    </Frame>
  );
}

/** DV04: licence number and expiry, read from the photo. */
export function DriverLicence() {
  const field = (label: string, value: string) => (
    <div className="flex items-center justify-between rounded-tile border border-line bg-surface px-4 py-3.5">
      <span>
        <span className="block text-meta text-ink-3">{label}</span>
        <span className="block text-[17px] font-semibold text-ink">{value}</span>
      </span>
      <span className="text-body-sm font-semibold text-green-800">{t.licence.edit}</span>
    </div>
  );
  return (
    <Frame step={2}>
      <h1 className="text-[28px] leading-tight font-semibold text-ink">{t.licence.title}</h1>
      <p className="flex items-center gap-2 rounded-callout bg-green-50 px-3.5 py-2.5 text-body-sm text-green-800">
        <Check aria-hidden className="size-4" strokeWidth={2.2} />
        {fill(t.licence.done, { name: SAMPLE.driver })}
      </p>
      <div className="grid h-40 place-items-center rounded-card border border-dashed border-line-strong bg-surface text-ink-3">
        <Camera aria-hidden className="size-8" strokeWidth={1.6} />
      </div>
      {field(t.licence.number, "KAN 04471 AA92")}
      {field(t.licence.expires, "18 Aug 2027")}
      <div className="mt-auto">
        <Primary>{t.licence.save}</Primary>
      </div>
    </Frame>
  );
}

/** DV08: joined, waiting for the licence check. */
export function DriverReady() {
  const done = <span className="rounded-pill bg-success-100 px-2.5 py-0.5 text-caption font-semibold text-success">{t.ready.done}</span>;
  return (
    <Frame>
      <div className="mt-10 flex flex-col items-center text-center">
        <SuccessCheck label={t.ready.title} />
        <h1 className="mt-5 text-[28px] leading-tight font-semibold text-ink">{t.ready.title}</h1>
        <p className="mt-2 text-[17px] text-ink-2">{fill(t.ready.text, { owner: SAMPLE.ownerShort })}</p>
      </div>
      <Rows
        rows={[
          { icon: UserRound, title: t.ready.rows.identity, end: done },
          { icon: FileText, title: t.ready.rows.licence, end: <span className="rounded-pill bg-warning-100 px-2.5 py-0.5 text-caption font-semibold text-warning">{t.ready.checking}</span> },
          { icon: Smartphone, title: t.ready.rows.phone, end: done },
          { icon: ShieldCheck, title: t.ready.rows.pin, end: done },
        ]}
      />
      <div className="mt-auto">
        <Primary>{t.ready.go}</Primary>
      </div>
    </Frame>
  );
}

/** DV11 / DV11b: a new trip to confirm, and the reasons sheet. */
export function DriverNewTrip({ cantDo = false }: { cantDo?: boolean }) {
  const [reason, setReason] = useState(cantDo ? 1 : -1);
  return (
    <Frame>
      <p className="text-meta font-semibold tracking-caps text-ink-3 uppercase">{fill(t.newTrip.eyebrow, { owner: SAMPLE.ownerShort })}</p>
      <div>
        <h1 className="text-[32px] leading-tight font-semibold text-ink">{SAMPLE.day}</h1>
        <p className="text-title-3 text-green-800">{fill(t.newTrip.loading, { window: SAMPLE.window })}</p>
      </div>
      <Rows
        rows={[
          { icon: MapPin, title: SAMPLE.from, sub: `${t.newTrip.from} · ${SAMPLE.fromPlace}` },
          { icon: MapPin, title: SAMPLE.to, sub: t.newTrip.to },
          { icon: Package, title: SAMPLE.load, sub: `${t.newTrip.load} · ${SAMPLE.note}` },
          { icon: Truck, title: SAMPLE.plate, sub: t.newTrip.truck },
        ]}
      />
      <div className="mt-auto flex flex-col gap-3">
        <Primary>{t.newTrip.yes}</Primary>
        <Secondary>{t.newTrip.no}</Secondary>
      </div>
      {cantDo ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="w-full rounded-t-[28px] bg-surface px-5 pt-6 pb-8">
            <h2 className="text-title-2 text-ink">{t.newTrip.whyTitle}</h2>
            <p className="mt-1 text-body text-ink-2">{fill(t.newTrip.whyText, { owner: SAMPLE.ownerShort })}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {t.newTrip.reasons.map((r, i) => (
                <button key={r} type="button" onClick={() => setReason(i)} className={cn("h-14 rounded-tile border text-body font-semibold", i === reason ? "border-green-800 bg-green-50 text-green-900" : "border-line text-ink")}>
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-body-sm text-ink-3">
              <Mic aria-hidden className="size-4.5" strokeWidth={1.8} />
              {t.newTrip.voice}
            </p>
            <div className="mt-4">
              <Primary>{t.newTrip.send}</Primary>
            </div>
          </div>
        </div>
      ) : null}
    </Frame>
  );
}

/** DV15: loading photos with the seal and count. */
export function DriverLoading() {
  return (
    <Frame>
      <div>
        <p className="text-meta font-semibold tracking-caps text-ink-3 uppercase">{t.loading.eyebrow}</p>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold text-ink">1,400 cartons of drinks · 28 t</h1>
        <p className="mt-1 text-body text-ink-2">{SAMPLE.note}</p>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-body font-semibold text-ink">{t.loading.photos}</p>
          <span className="text-meta font-semibold text-ink-3">{fill(t.loading.count, { n: 2, total: 3 })}</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {["8:51 · Ikeja", "8:53 · Ikeja"].map((stamp) => (
            <div key={stamp} className="relative grid aspect-square place-items-end rounded-tile bg-[#5B6B60] p-2 text-caption font-semibold text-white">
              {stamp}
            </div>
          ))}
          <div className="grid aspect-square place-items-center rounded-tile border border-dashed border-line-strong bg-surface text-meta font-semibold text-ink-3">
            <span className="flex flex-col items-center gap-1">
              <Camera aria-hidden className="size-6" strokeWidth={1.6} />
              {t.loading.back}
            </span>
          </div>
        </div>
        <p className="mt-2 text-meta text-ink-3">{t.loading.photoHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[
          [t.loading.seal, SAMPLE.seal],
          [t.loading.goodsCount, "1,400"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-tile border border-line bg-surface px-4 py-3">
            <span className="block text-meta text-ink-3">{k}</span>
            <span className="tabular block text-title-3 text-ink">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto">
        <button type="button" disabled className={cn(BIG, "bg-[#9BA39D] text-white")}>
          {fill(t.loading.next, { n: 1 })}
        </button>
      </div>
    </Frame>
  );
}

/** A full-screen result: DV16b, DV19b, DV20, DV23, DV32c. */
export function DriverResult({ kind }: { kind: "confirmed" | "anyProblem" | "complete" | "cancelled" | "sent" }) {
  if (kind === "cancelled")
    return (
      <div className="-mx-5 -mt-8 flex min-h-dvh flex-col gap-4 bg-[#B42318] px-6 pt-24 pb-8 text-white">
        <h1 className="text-[36px] leading-tight font-semibold">{t.cancelled.title}</h1>
        <p className="text-[19px] text-white/90">{t.cancelled.text}</p>
        <p className="rounded-card bg-white/12 p-4 text-[17px]">{t.cancelled.paid}</p>
        <button type="button" className={cn(BIG, "mt-auto bg-white text-[#B42318]")}>
          {t.cancelled.ok}
        </button>
      </div>
    );
  const body = {
    confirmed: { title: t.confirmed.title, text: fill(t.confirmed.text, { n: 3, seal: SAMPLE.seal }), main: t.confirmed.start },
    anyProblem: { title: t.anyProblem.title, text: fill(t.anyProblem.ask, { name: SAMPLE.receiver }), main: t.anyProblem.no },
    complete: { title: fill(t.complete.title, { name: SAMPLE.first }), text: fill(t.complete.text, { route: "Lagos → Kano", when: "Sat 28 Nov, 1:48 pm", n: 4 }), main: t.complete.done },
    sent: { title: t.sent.title, text: fill(t.sent.text, { owner: SAMPLE.ownerShort }), main: t.sent.done },
  }[kind];
  return (
    <Frame>
      <div className="mt-14 flex flex-col items-center text-center">
        <SuccessCheck label={body.title} />
        <h1 className="mt-5 text-[28px] leading-tight font-semibold text-ink">{body.title}</h1>
        <p className="mt-2 text-[17px] text-ink-2">{body.text}</p>
      </div>
      {kind === "complete" ? (
        <section>
          <h2 className="mb-2 text-meta font-semibold tracking-caps text-ink-3 uppercase">{t.complete.next}</h2>
          <Rows rows={[{ icon: Truck, title: "Kano → Lagos · Mon 30 Nov", sub: `Onions, 24 t · from ${SAMPLE.ownerShort}`, end: <span className="text-body-sm font-semibold text-green-800">{t.complete.see}</span> }]} />
        </section>
      ) : null}
      <div className="mt-auto flex flex-col gap-3">
        <Primary>{body.main}</Primary>
        {kind === "anyProblem" ? <Secondary danger>{t.anyProblem.yes}</Secondary> : null}
      </div>
    </Frame>
  );
}

/** DV18: arrived at the drop-off. */
export function DriverArrived() {
  return (
    <Frame>
      <div>
        <p className="text-meta font-semibold tracking-caps text-ink-3 uppercase">{t.arrived.eyebrow}</p>
        <h1 className="mt-1 text-[32px] leading-tight font-semibold text-ink">{SAMPLE.to}</h1>
      </div>
      <div className="rounded-card border border-line bg-surface p-4.5">
        <p className="text-meta text-ink-3">{t.arrived.what}</p>
        <p className="text-[17px] font-semibold text-ink">{fill(t.arrived.todo, { name: SAMPLE.receiver })}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: Phone, label: fill(t.arrived.call, { name: SAMPLE.receiver }) },
          { icon: Clock, label: t.arrived.notHere },
        ].map((x) => (
          <button key={x.label} type="button" className="flex h-21 flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface text-meta font-semibold text-ink">
            <x.icon aria-hidden className="size-6.5 text-green-800" strokeWidth={1.8} />
            {x.label}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-3">
        <Primary>
          <span className="inline-flex items-center gap-2">
            <Camera aria-hidden className="size-5" strokeWidth={1.8} />
            {t.arrived.photo}
          </span>
        </Primary>
        <button type="button" disabled className={cn(BIG, "border border-line bg-surface text-ink-3")}>
          {t.arrived.code}
        </button>
      </div>
    </Frame>
  );
}

/** DV21: report a problem. */
export function DriverProblem() {
  const [pick, setPick] = useState(0);
  const [fix, setFix] = useState<boolean | null>(true);
  return (
    <Frame>
      <h1 className="text-[28px] leading-tight font-semibold text-ink">{t.problem.title}</h1>
      <div className="grid grid-cols-2 gap-2.5">
        {t.problem.reasons.map((r, i) => (
          <button key={r} type="button" onClick={() => setPick(i)} className={cn("h-16 rounded-tile border px-3 text-body font-semibold", i === pick ? "border-green-800 bg-green-50 text-green-900" : "border-line bg-surface text-ink")}>
            {r}
          </button>
        ))}
      </div>
      <div>
        <p className="text-body font-semibold text-ink">{t.problem.fix}</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" onClick={() => setFix(v)} className={cn("h-14 rounded-tile border text-body font-semibold", fix === v ? "border-green-800 bg-green-50 text-green-900" : "border-line bg-surface text-ink")}>
              {v ? t.problem.yes : t.problem.no}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="flex h-16 items-center justify-center gap-2 rounded-tile border border-dashed border-line-strong bg-surface text-body font-semibold text-ink">
        <Mic aria-hidden className="size-5" strokeWidth={1.8} />
        {t.problem.record}
      </button>
      <div className="mt-auto flex flex-col gap-2">
        <Primary>{t.problem.send}</Primary>
        <p className="text-center text-meta text-ink-3">{t.problem.after}</p>
      </div>
    </Frame>
  );
}

/** DV31b: a past trip with its proof (no money, D003). */
export function DriverPastTrip() {
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full border border-line bg-surface">
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.8} />
        </span>
        <span className="tabular text-body font-semibold text-ink">FA-8D2V5</span>
        <span className="ml-auto rounded-pill bg-success-100 px-2.5 py-0.5 text-caption font-semibold text-success">{t.past.delivered}</span>
      </div>
      <div>
        <h1 className="text-[28px] leading-tight font-semibold text-ink">Lagos → Kano</h1>
        <p className="text-body text-ink-2">{fill(t.past.loaded, { loaded: "27 Nov", delivered: "28 Nov, 1:48 pm" })}</p>
      </div>
      <Rows
        rows={[
          { icon: Camera, title: fill(t.past.photos, { seal: SAMPLE.seal }) },
          { icon: CircleCheck, title: t.past.delivery, sub: fill(t.past.code, { name: SAMPLE.receiver, time: "1:48 pm" }) },
        ]}
      />
    </Frame>
  );
}
