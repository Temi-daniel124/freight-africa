"use client";

import { LoaderCircle, MapPin, MapPinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { saveEmergencyContact } from "./actions";

// DV06 Test your GPS, with the optional emergency contact. The location is read once on the phone and
// never sent: this only checks the phone can find itself before the first trip.

const t = messages.driverGps;
type Gps = { state: "idle" | "testing" } | { state: "ok"; metres: number } | { state: "denied" | "weak" };

export function GpsTest({ next, name = "", phone = "" }: { next: string; name?: string; phone?: string }) {
  const router = useRouter();
  const [gps, setGps] = useState<Gps>({ state: "idle" });
  const [contact, setContact] = useState({ name, phone });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const test = () => {
    if (!("geolocation" in navigator)) return setGps({ state: "weak" });
    setGps({ state: "testing" });
    navigator.geolocation.getCurrentPosition(
      (p) => setGps({ state: "ok", metres: Math.max(1, Math.round(p.coords.accuracy)) }),
      (e) => setGps({ state: e.code === e.PERMISSION_DENIED ? "denied" : "weak" }),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  };

  const ready = () =>
    start(async () => {
      const r = await saveEmergencyContact(contact.name, contact.phone);
      if (r.status === "ok") return router.push(next);
      setError(r.status === "phone" ? t.phoneError : r.status === "name" ? t.nameError : t.error);
    });

  const failed = gps.state === "denied" || gps.state === "weak";
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-meta text-ink-3">{messages.driverInstall.step}</p>
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-[17px] text-ink-2">{t.lead}</p>
      </div>
      {gps.state === "idle" ? null : (
        <div role="status" className={cn("flex items-center gap-3.5 rounded-card border p-4", failed ? "border-danger-100 bg-danger-50" : "border-line bg-surface")}>
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", failed ? "bg-danger-100 text-danger" : "bg-green-50 text-green-700")}>
            {gps.state === "testing" ? <LoaderCircle aria-hidden className="size-6 motion-safe:animate-spin" strokeWidth={1.8} /> : failed ? <MapPinOff aria-hidden className="size-6" strokeWidth={1.8} /> : <MapPin aria-hidden className="size-6" strokeWidth={1.8} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold text-ink">{gps.state === "testing" ? t.testing : gps.state === "ok" ? t.working : gps.state === "denied" ? t.denied : t.weak}</span>
            {gps.state === "ok" ? <span className="block text-meta text-ink-3">{t.accuracy.replace("{m}", String(gps.metres))}</span> : null}
            {failed ? <span className="block text-meta text-ink-2">{gps.state === "denied" ? t.deniedText : t.weakText}</span> : null}
          </span>
        </div>
      )}
      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <p className="text-[17px] font-semibold text-ink">
          {t.emergency} <span className="font-normal text-ink-3">{t.optional}</span>
        </p>
        <TextField id="em-name" label={t.name} value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} autoComplete="off" maxLength={80} />
        <PhoneField id="em-phone" label={t.phone} defaultValue={phone} error={error === t.phoneError ? error : undefined} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
      </section>
      {error && error !== t.phoneError ? (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3">
        {gps.state === "ok" ? (
          <Button className="h-17 w-full text-[17px]" loading={pending} onClick={ready}>
            {t.ready}
          </Button>
        ) : (
          <Button className="h-17 w-full text-[17px]" loading={gps.state === "testing"} onClick={test}>
            {failed ? t.again : t.test}
          </Button>
        )}
      </div>
    </div>
  );
}
