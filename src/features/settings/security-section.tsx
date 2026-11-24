"use client";

import { ChevronRight, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import messages from "@/messages/en.json";
import { signOutEverywhere, turnOffTwoStep } from "./security-actions";

const t = messages.settings.security;

function Row({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value?: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 rounded-inner px-1 text-body text-ink hover:bg-paper">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value ? <span className="shrink-0 text-label font-normal text-ink-3">{value}</span> : null}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
    </Link>
  );
}

/** A-10 Security (D044): PIN, two-step sign-in, sign out everywhere. */
export function SecuritySection({ back, twoStep, staff, lockMinutes, changed }: { back: string; twoStep: boolean; staff: boolean; lockMinutes: number; changed: boolean }) {
  const [on, setOn] = useState(twoStep);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      {changed ? <p role="status" className="mb-2 rounded-inner bg-success-100 px-3 py-2 text-label text-success">{t.pinChanged}</p> : null}
      <Row href={`/auth/pin/change?back=${encodeURIComponent(back)}`} icon={<KeyRound aria-hidden className="size-5" strokeWidth={1.75} />} label={t.changePin} value={t.lockAfter.replace("{n}", String(lockMinutes))} />
      {on ? (
        <div className="flex min-h-14 items-center gap-3 px-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-50 text-green-700">
            <ShieldCheck aria-hidden className="size-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1 text-body text-ink">{t.twoStepOn}</span>
          {staff ? null : (
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const result = await turnOffTwoStep();
                  if (result.status === "ok") setOn(false);
                  else setFailed(true);
                })
              }
            >
              {t.turnOff}
            </Button>
          )}
        </div>
      ) : (
        <Row href={`/auth/two-step/add?next=${encodeURIComponent(back)}`} icon={<ShieldCheck aria-hidden className="size-5" strokeWidth={1.75} />} label={t.addTwoStep} value={t.recommended} />
      )}
      {failed ? <p role="alert" className="text-label text-danger">{t.turnOffFailed}</p> : null}
      <form action={signOutEverywhere} className="mt-2">
        <Button type="submit" variant="tertiary" size="text" className="gap-2 px-1">
          <LogOut aria-hidden className="size-5" strokeWidth={1.75} />
          {t.signOutEverywhere}
        </Button>
      </form>
    </div>
  );
}
