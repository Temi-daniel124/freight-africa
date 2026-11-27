"use client";

import { Camera, Check, List, MapPin, Navigation, Phone, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Keypad } from "@/components/ui/keypad";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { SosActive, SosButton } from "./sos";

// DV13–DV20 the trip, one 68 px button per step, with SOS on every live step. The steps' server side
// (arrival inside the pickup area, photos, codes) is Phase 4, so these show in /dev with sample data.

const t = messages.driverSteps;
type Tile = { icon: typeof Phone; label: string; warn?: boolean };
export type StepView = {
  eyebrow: string;
  title: string;
  sub?: string;
  todo?: string;
  note?: string;
  banner?: string;
  tiles: Tile[];
  button: string;
  buttonOff?: boolean;
  night?: boolean;
};

const ICON = { directions: Navigation, call: Phone, rest: MapPin, problem: TriangleAlert, details: List, photo: Camera };
const tiles = (keys: (keyof typeof ICON)[], call = t.tiles.call): Tile[] =>
  keys.map((k) => ({ icon: ICON[k], label: k === "call" ? call : t.tiles[k as keyof typeof t.tiles], warn: k === "problem" }));

export const STEPS: Record<string, StepView> = {
  topickup: { eyebrow: t.toPickup, title: "Okafor Foods depot, Ikeja", sub: "2.4 km · about 9 min", todo: t.todo.drive, tiles: tiles(["directions", "call", "rest", "problem"]), button: `${t.arrived} · 2.4 km to go`, buttonOff: true },
  atpickup: { eyebrow: t.atPickup, title: "Okafor Foods depot, Ikeja", sub: "Arrived 7:42 am", todo: t.todo.wait.replace("{name}", "Chidi"), note: t.freeWait.replace("{waited}", "1 h 05 min"), tiles: tiles(["call", "details", "problem"], t.tiles.callName.replace("{name}", "Chidi")), button: t.startLoading },
  onroad: { eyebrow: "To Kano · Sabon Gari", title: "612 km", sub: "Arrive Sat about 2 pm", todo: "On the road to Kano. Next approved rest stop: Jebba park, 48 km.", banner: t.askedCall.replace("{name}", "Ibrahim (receiver)"), tiles: tiles(["rest", "call", "problem"]), button: t.tiles.directions, night: true },
};

function Top({ night, onSos }: { night?: boolean; onSos: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("inline-flex h-9 items-center gap-2 rounded-pill border px-3.5 text-meta font-semibold", night ? "border-white/15 bg-white/5 text-white/90" : "border-line bg-surface text-ink")}>
        <span aria-hidden className="size-2.5 rounded-full bg-green-500" />
        {t.tracking}
        <span aria-hidden>·</span>
        <RefreshCw aria-hidden className="size-3.5" strokeWidth={2} />
        82%
      </span>
      <SosButton onFire={onSos} compact />
    </div>
  );
}

export function TripStep({ view }: { view: StepView }) {
  const [sos, setSos] = useState(false);
  const night = view.night;
  return (
    <div className={cn("-mx-5 -mt-8 flex min-h-dvh flex-col gap-4 px-5 pt-6 pb-8", night ? "bg-[#0E1712] text-white" : "bg-paper")}>
      <Top night={night} onSos={() => setSos(true)} />
      {view.banner ? (
        <div className={cn("flex items-center gap-3 rounded-card border p-4", night ? "border-white/10 bg-white/5" : "border-line bg-surface")}>
          <Phone aria-hidden className="size-5 shrink-0" strokeWidth={1.8} />
          <span className="flex-1 text-[17px] font-semibold">{view.banner}</span>
          <span className={cn("text-body font-semibold", night ? "text-green-300" : "text-green-800")}>{t.tiles.call}</span>
        </div>
      ) : null}
      <div>
        <p className={cn("text-meta font-semibold tracking-[0.06em] uppercase", night ? "text-white/60" : "text-ink-3")}>{view.eyebrow}</p>
        <h1 className={cn("mt-1 font-semibold leading-tight", view.title.length < 12 ? "text-[56px]" : "text-[32px]")}>{view.title}</h1>
        {view.sub ? <p className={cn("mt-1 text-title-3", night ? "text-white/80" : "text-green-800")}>{view.sub}</p> : null}
      </div>
      {view.todo ? (
        <div className={cn("rounded-card p-4.5", night ? "text-white/80" : "border border-line bg-surface")}>
          {night ? null : <p className="text-meta text-ink-3">{t.whatNow}</p>}
          <p className="text-[17px] font-semibold">{view.todo}</p>
          {view.note ? <p className="mt-2 rounded-callout bg-green-50 px-3 py-2 text-meta text-green-800">{view.note}</p> : null}
        </div>
      ) : null}
      <div className={cn("grid gap-2.5", view.tiles.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {view.tiles.map((tile) => (
          <button key={tile.label} type="button" className={cn("flex h-21 flex-col items-center justify-center gap-2 rounded-card border px-1 text-meta font-semibold", night ? "border-white/10 bg-white/5 text-white/90" : "border-line bg-surface text-ink")}>
            <tile.icon aria-hidden className={cn("size-6.5", tile.warn ? "text-warning" : night ? "text-white/80" : "text-green-800")} strokeWidth={1.8} />
            {tile.label}
          </button>
        ))}
      </div>
      <button type="button" disabled={view.buttonOff} className={cn("mt-auto h-17 w-full rounded-button text-[18px] font-semibold", view.buttonOff ? "bg-[#9BA39D] text-white" : night ? "bg-green-300 text-green-900" : "bg-green-900 text-white")}>
        {view.button}
      </button>
      {sos ? <SosActive who="Freight Africa, Musa Danladi and Aisha Bello" near="Jebba" onSafe={() => setSos(false)} /> : null}
    </div>
  );
}

/** DV16 / DV19: the person at the stop gives the code; the driver types it (never holds one, D003). */
export function CodeStep({ kind }: { kind: "loading" | "delivery" }) {
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(kind === "delivery");
  const name = kind === "loading" ? "Chidi" : "Ibrahim";
  const onKey = (k: string) => {
    setWrong(false);
    setCode((c) => (k === "delete" ? c.slice(0, -1) : c.length < 6 ? c + k : c));
  };
  return (
    <div className="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-5">
      {kind === "delivery" ? (
        <p className="inline-flex items-center gap-2 self-start rounded-pill bg-green-50 px-3 py-1.5 text-meta font-semibold text-green-800">
          <Check aria-hidden className="size-4" strokeWidth={2.2} />
          {t.photoTaken}
        </p>
      ) : null}
      <h1 className="text-[28px] leading-tight font-semibold text-ink">{(kind === "loading" ? t.askLoading : t.askDelivery).replace("{name}", name)}</h1>
      <p className="text-[17px] text-ink-2">{(kind === "loading" ? t.loadingHas : t.deliveryHas).replace("{name}", name)}</p>
      <div className="grid grid-cols-6 gap-2" aria-live="polite">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cn("grid h-16 place-items-center rounded-input border text-title-2 font-semibold", wrong ? "border-danger text-danger" : "border-line-field bg-surface text-ink")}>
            {(wrong ? "482910" : code)[i] ?? ""}
          </span>
        ))}
      </div>
      {wrong ? <p className="text-body font-semibold text-danger">{t.wrongCode.replace("{n}", "3")}</p> : null}
      <div className="mt-auto">
        <Keypad onKey={onKey} deleteLabel={t.delete} roomy />
        <button type="button" disabled={code.length !== 6} className="mt-4 h-17 w-full rounded-button bg-green-900 text-[18px] font-semibold text-white disabled:opacity-40">
          {t.confirm}
        </button>
      </div>
    </div>
  );
}
