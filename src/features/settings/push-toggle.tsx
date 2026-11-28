"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import messages from "@/messages/en.json";
import { removePushSubscription, savePushSubscription } from "./push-actions";

// N-02 push on this device: the browser asks once; the subscription is kept for this person only.
const t = messages.push;
type State = "unsupported" | "off" | "on" | "blocked";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle() {
  const [state, setState] = useState<State>("unsupported");
  const [pending, start] = useTransition();
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  useEffect(() => {
    if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(Notification.permission === "denied" ? "blocked" : sub ? "on" : "off");
    });
  }, [key]);
  if (state === "unsupported" || !key) return null;
  const toggle = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (state === "on") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await removePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        return setState("off");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      if (await savePushSubscription(json, navigator.userAgent)) setState("on");
      else toast.error(t.failed);
    });
  return (
    <button type="button" onClick={toggle} disabled={pending || state === "blocked"} className="flex min-h-14 w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left disabled:opacity-60">
      {state === "on" ? <Bell aria-hidden className="size-5 text-green-700" strokeWidth={1.8} /> : <BellOff aria-hidden className="size-5 text-ink-3" strokeWidth={1.8} />}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">{t.title}</span>
        <span className="block text-meta text-ink-3">{state === "on" ? t.on : state === "blocked" ? t.blocked : t.off}</span>
      </span>
      <span className="text-body-sm font-semibold text-green-800">{state === "on" ? t.turnOff : state === "blocked" ? "" : t.turnOn}</span>
    </button>
  );
}
