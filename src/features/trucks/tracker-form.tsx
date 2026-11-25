"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import messages from "@/messages/en.json";
import { saveTracker, trackerSignal } from "./tracker-actions";

const t = messages.tracker;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-inner bg-paper px-4 py-2">
      <span className="min-w-0">
        <span className="block text-caption text-ink-3">{label}</span>
        <span className="block truncate font-mono text-body-sm text-ink">{value}</span>
      </span>
      <button type="button" onClick={() => void navigator.clipboard?.writeText(value).then(() => setDone(true))} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-label font-semibold text-green-700">
        {done ? <Check aria-hidden className="size-4" strokeWidth={2} /> : <Copy aria-hidden className="size-4" strokeWidth={1.75} />}
        {done ? t.copied : t.copy}
      </button>
    </div>
  );
}

/** T-18 Connect a GPS tracker: the ID, the server details to set on the tracker, and Test connection. */
export function TrackerForm({ truckId, current, server }: { truckId: string; current: string | null; server: string }) {
  const [device, setDevice] = useState(current ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState(false);
  // The key is shown once, inside the server address to set on the tracker.
  const [key, setKey] = useState<string | null>(null);

  const test = async () => {
    setTesting(true);
    setMessage(t.waiting);
    const since = Date.now();
    // Waits up to 5 minutes for a signal, checking every 10 seconds.
    while (Date.now() - since < 5 * 60_000) {
      const signal = await trackerSignal(truckId);
      if (signal && new Date(signal.at).getTime() >= since - 60_000) {
        setMessage(t.received.replace("{time}", new Date(signal.at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })).replace("{lat}", signal.lat.toFixed(4)).replace("{lng}", signal.lng.toFixed(4)));
        setTesting(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 10_000));
    }
    setMessage(t.noSignal);
    setTesting(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-body text-ink-2">{t.lead}</p>
      <p className="text-body-sm text-ink-2">{t.types}</p>
      <TextField id="tracker-id" label={t.idLabel} helper={t.idHelp} value={device} onChange={(e) => setDevice(e.target.value)} autoCapitalize="characters" spellCheck={false} />
      <div className="flex flex-col gap-2">
        <p className="text-label text-ink">{t.setOnTracker}</p>
        <CopyRow label={t.server} value={key ? `${server}?key=${key}` : t.saveFirst} />
        <CopyRow label={t.protocol} value="OsmAnd (HTTP)" />
      </div>
      {message ? (
        <p role="status" className="rounded-inner bg-green-50 px-4 py-3 text-body-sm text-green-900">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await saveTracker(truckId, device);
              if (r.status === "ok") setKey(r.key);
              setMessage(r.status === "ok" ? t.saved : r.status === "invalid" ? t.invalid : r.status === "taken" ? t.taken : messages.booking.errors.failed);
            })
          }
        >
          {t.save}
        </Button>
        <Button variant="secondary" loading={testing} disabled={!current && !device} onClick={() => void test()}>
          {t.test}
        </Button>
      </div>
    </div>
  );
}
