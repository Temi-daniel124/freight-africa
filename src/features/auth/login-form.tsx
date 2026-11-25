"use client";

import { ArrowRight, CircleAlert, ShieldCheck, UserRound, WifiOff } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import messages from "@/messages/en.json";
import { startPinSignIn, type LoginState } from "./pin-actions";

const t = messages.auth.signin;

/** A-01 Sign in (D044): email, or phone for people invited by phone, then the PIN. No email code. */
export function LoginForm({ next }: { next: string }) {
  const online = useOnline();
  const [state, action, pending] = useActionState(startPinSignIn, { status: "idle", value: "", attempt: 0 } satisfies LoginState);
  const error = state.status === "invalid" ? t.invalid : null;
  return (
    <div className="flex flex-col">
      <h1 className="type-signin text-balance text-ink">{t.title}</h1>
      <p className="type-signin-lead mt-3 text-wrap text-ink-2">{t.lead}</p>

      {online ? null : (
        <p role="status" className="mt-6 flex items-start gap-2 rounded-inner bg-warning-100 p-4 text-body text-ink">
          <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.75} />
          {messages.auth.offline}
        </p>
      )}

      <form action={action} noValidate className="mt-6 flex flex-col lg:mt-8">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="auth-login" className="mb-2 text-label text-ink">
          {t.loginLabel}
        </label>
        <div className="relative">
          <UserRound aria-hidden className="pointer-events-none absolute top-4 left-4 size-5 text-ink-3" strokeWidth={1.75} />
          <input
            key={state.attempt}
            id="auth-login"
            name="login"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder={t.loginPlaceholder}
            defaultValue={state.value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "auth-login-error" : undefined}
            className="h-14 w-full min-w-0 rounded-input border border-line-strong bg-surface pr-4 pl-12 text-control text-ink transition outline-none motion-instant placeholder:text-ink-3 focus:border-green-700 focus:ring-4 focus:ring-green-500/16 aria-invalid:border-danger"
          />
        </div>
        {error ? (
          <p id="auth-login-error" className="mt-helper flex items-start gap-1 text-caption text-danger">
            <CircleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
            {error}
          </p>
        ) : null}
        <Button type="submit" className="mt-4 w-full text-control font-semibold" disabled={!online} loading={pending} loadingLabel={t.continuing}>
          {t.continue}
          <ArrowRight aria-hidden className="size-4.5" strokeWidth={1.75} />
        </Button>
      </form>

      <p className="mt-5 flex items-center gap-2 text-label leading-4 font-medium text-wrap text-ink-2">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-green-700" strokeWidth={1.75} />
        {t.noCode}
      </p>

      <p className="mt-8 border-t border-line pt-5 text-body-sm text-ink-2">
        {t.getStarted}{" "}
        <Link href={`/auth?mode=start&next=${encodeURIComponent(next)}`} className="font-semibold text-green-700">
          {t.getStartedLink}
        </Link>
      </p>
    </div>
  );
}
