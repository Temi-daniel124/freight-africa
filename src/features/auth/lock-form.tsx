"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import messages from "@/messages/en.json";
import { lockMyAccount, type LockState } from "./lock-actions";

const t = messages.auth.lock;

export function LockForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(lockMyAccount, { status: "idle" } satisfies LockState);
  if (state.status === "done") {
    return (
      <div className="flex flex-col gap-5">
        <ShieldCheck aria-hidden className="size-12 text-green-700" strokeWidth={1.5} />
        <h1 className="text-title-1 text-ink">{t.doneTitle}</h1>
        <p className="text-body text-ink-2">{t.doneLead}</p>
        <Link href="/auth?mode=start" className={buttonVariants({ className: "w-full" })}>
          {t.signIn}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <ShieldAlert aria-hidden className="size-12 text-danger" strokeWidth={1.5} />
      <h1 className="text-title-1 text-ink">{t.title}</h1>
      <p className="text-body text-ink-2">{state.status === "invalid" ? t.invalid : t.lead}</p>
      {state.status === "error" ? <p role="alert" className="text-label text-danger">{messages.auth.pin.failed}</p> : null}
      <input type="hidden" name="t" value={token} />
      {state.status === "invalid" ? null : (
        <Button type="submit" variant="destructive" loading={pending} loadingLabel={t.locking} loadingText className="w-full">
          {t.button}
        </Button>
      )}
    </form>
  );
}
