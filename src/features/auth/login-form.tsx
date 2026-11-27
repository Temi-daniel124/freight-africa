"use client";

import { ArrowRight, CircleAlert, Lock, Mail, WifiOff } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/lib/use-online";
import messages from "@/messages/en.json";
import { AuthActions, AuthBody, AuthTop, NewHere } from "./auth-frame";
import { startPinSignIn, type LoginState } from "./pin-actions";

const t = messages.auth.signin;

/** A-01 Sign in (D044, mockups P03 and D01): email, or phone for people invited by phone, then the PIN. */
export function LoginForm({ next }: { next: string }) {
  const online = useOnline();
  const [state, action, pending] = useActionState(startPinSignIn, { status: "idle", value: "", attempt: 0 } satisfies LoginState);
  const error = state.status === "invalid" ? t.invalid : null;
  const startHref = `/auth?mode=start&next=${encodeURIComponent(next)}`;
  return (
    <form action={action} noValidate className="flex flex-1 flex-col">
      <AuthTop back="/auth/welcome" desktopEnd={<NewHere href={startHref} />} />
      <input type="hidden" name="next" value={next} />
      <AuthBody className="pt-10 lg:pt-0">
        <h1 className="type-signin text-balance text-ink">
          <span className="lg:hidden">{t.title}</span>
          <span className="hidden lg:inline">{t.deskTitle}</span>
        </h1>
        <p className="type-signin-lead mt-3 text-ink-2">
          <span className="lg:hidden">{t.lead}</span>
          <span className="hidden lg:inline">{t.deskLead}</span>
        </p>

        {online ? null : (
          <p role="status" className="mt-6 flex items-start gap-2 rounded-callout bg-warning-100 p-4 text-body text-ink">
            <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.75} />
            {messages.auth.offline}
          </p>
        )}

        <label htmlFor="auth-login" className="mt-8 mb-2 block text-label text-ink lg:text-body-sm">
          {t.loginLabel}
        </label>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-3 lg:hidden" strokeWidth={1.75} />
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
            aria-describedby={error ? "auth-login-error" : "auth-login-hint"}
            className="h-14.5 w-full min-w-0 rounded-input border border-line-field bg-surface pr-4 pl-12 text-control text-ink transition outline-none motion-instant placeholder:text-placeholder focus:border-field focus:border-green-700 focus:shadow-[0_0_0_4px_rgba(12,80,52,0.1)] aria-invalid:border-danger lg:h-14 lg:pl-4"
          />
        </div>
        {error ? (
          <p id="auth-login-error" className="mt-2.5 flex items-start gap-1 text-label leading-4.5 font-medium text-danger">
            <CircleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
            {error}
          </p>
        ) : (
          <p id="auth-login-hint" className="mt-2.5 text-label leading-normal font-normal text-ink-3 lg:mt-2 lg:text-caption">
            <span className="lg:hidden">{t.hint}</span>
            <span className="hidden lg:inline">{t.deskHint}</span>
          </p>
        )}
      </AuthBody>

      <AuthActions className="lg:gap-5">
        <Button type="submit" className="w-full" disabled={!online} loading={pending} loadingLabel={t.continuing}>
          {t.continue}
          <ArrowRight aria-hidden className="lg:hidden" strokeWidth={1.75} />
        </Button>
        <p className="text-center text-body-sm font-normal text-ink-2 lg:hidden">
          {t.getStarted}{" "}
          <Link href={startHref} className="inline-block py-3 font-semibold text-green-700">
            {t.getStartedLink}
          </Link>
        </p>
        <p className="hidden items-start gap-3 rounded-callout bg-green-50 px-4 py-3.5 text-meta text-green-800 lg:flex">
          <Lock aria-hidden className="size-5 shrink-0 text-green-700" strokeWidth={1.8} />
          {t.deskNote}
        </p>
      </AuthActions>
    </form>
  );
}
