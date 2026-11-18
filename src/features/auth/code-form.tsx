"use client";

import { CircleAlert, CircleCheck, ShieldCheck, WifiOff } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { useOnline } from "@/lib/use-online";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { resendCode, verifyCode } from "./actions";
import { CODE_MINUTES } from "./code-rules";
import type { ResendState, VerifyState } from "./state";

export type CodeText = {
  eyebrow: string;
  title: string;
  resendHint: string;
  note: string;
  sentEmail: string;
  sentWhatsApp: string;
  change: string;
  label: string;
  submit: string;
  checking: string;
  resend: string;
  resendIn: string;
  resent: string;
  wrong: string;
  locked: string;
  expired: string;
  offline: string;
  rateLimited: string;
  failed: string;
  done: string;
};

/** Preview-only: start the screen in a given state (the /dev/sign-in page). Never set on the real page. */
export type CodePreview = { verify?: VerifyState; resend?: ResendState; latest?: "verify" | "resend"; code?: string; locked?: boolean; expired?: boolean; offline?: boolean; seconds?: number };

type CodeFormProps = {
  t: CodeText;
  channel: "email" | "whatsapp";
  to: string;
  length: number;
  /** How long the code has left, measured on the server, or null when unknown. Counted from page load so a
   * phone with a wrong clock can't call a good code expired. */
  expiresInMs?: number | null;
  preview?: CodePreview;
};

const RESEND_SECONDS = 30;
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

// A-02: enter the code. A full code is sent as soon as it's typed or pasted; a wrong one shakes the boxes;
// five wrong tries need a new code; "Resend code" unlocks after 30 seconds.
export function CodeForm({ t, channel, to, length, expiresInMs = null, preview }: CodeFormProps) {
  const reduced = usePrefersReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const online = useOnline() && !preview?.offline;
  const [code, setCode] = useState(preview?.code ?? "");
  const [seconds, setSeconds] = useState(preview?.seconds ?? RESEND_SECONDS);
  const [verify, verifyAction, verifying] = useActionState(verifyCode, preview?.verify ?? ({ status: "idle", attempt: 0 } satisfies VerifyState));
  const [resend, resendAction, resending] = useActionState(resendCode, preview?.resend ?? ({ status: "idle", attempt: 0 } satisfies ResendState));

  // What the person last did decides which message shows: a wrong code, or a new code being sent.
  const [latest, setLatest] = useState<"verify" | "resend">(preview?.latest ?? "verify");
  const done = verify.status === "ok";
  // No tries left on the current code. Its own state, so asking for a new code lifts it and typing that
  // code doesn't bring it back.
  const [locked, setLocked] = useState(preview?.locked ?? false);
  // The code has passed its ten minutes: the same way out as "no tries left", a new code.
  const [expired, setExpired] = useState(preview?.expired ?? false);
  const blocked = locked || expired;

  // Time left on the current code; a new code starts a fresh ten minutes.
  const [timeLeft, setTimeLeft] = useState(expiresInMs);
  useEffect(() => {
    if (timeLeft === null || expired) return;
    const id = window.setTimeout(() => setExpired(true), timeLeft);
    return () => window.clearTimeout(id);
  }, [timeLeft, expired]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  // When a result comes back, reset the boxes during render (React: "adjusting state when a prop changes"),
  // so there is no extra paint with the old digits.
  const [seenVerify, setSeenVerify] = useState(preview?.verify?.attempt ?? 0);
  if (verify.attempt !== seenVerify) {
    setSeenVerify(verify.attempt);
    // A wrong code clears the boxes for the next try.
    if (verify.status === "wrong" || verify.status === "locked" || verify.status === "expired") setCode("");
    if (verify.status === "locked") setLocked(true);
    if (verify.status === "expired") setExpired(true);
  }
  const [seenResend, setSeenResend] = useState(preview?.resend?.attempt ?? 0);
  if (resend.attempt !== seenResend) {
    setSeenResend(resend.attempt);
    // A new code restarts the wait and clears the boxes.
    if (resend.status === "sent") {
      setLocked(false);
      setExpired(false);
      setTimeLeft(CODE_MINUTES * 60_000);
      setCode("");
      setSeconds(RESEND_SECONDS);
    }
  }

  // Right code: the boxes turn green one after another, then the app opens.
  useEffect(() => {
    // The preview page shows the success state without leaving.
    if (!done || preview) return;
    // /auth/done clears the "code on its way" cookie and sends the person on to where they were heading.
    const id = window.setTimeout(() => window.location.replace("/auth/done"), reduced ? 0 : 400 + length * 60);
    return () => window.clearTimeout(id);
  }, [done, reduced, length, preview]);

  const change = (value: string) => {
    setCode(value);
    if (value.length === length && !verifying && !done && online) {
      setLatest("verify");
      // Wait for React to put the value in the field before sending the form.
      window.setTimeout(() => {
        const field = formRef.current?.elements.namedItem("code");
        // A disabled field is left out of the form, which would read as a wrong code.
        if (field instanceof HTMLInputElement && !field.disabled) formRef.current?.requestSubmit();
      }, 0);
    }
  };

  const message =
    latest === "resend"
      ? resend.status === "rate_limited"
        ? t.rateLimited
        : resend.status === "error"
          ? t.failed
          : null
      : expired
        ? t.expired
        : verify.status === "wrong"
          ? t.wrong
          : locked
            ? t.locked
          : verify.status === "error"
            ? t.failed
            : null;
  const inputState = done ? "success" : latest === "verify" && (verify.status === "wrong" || verify.status === "locked" || verify.status === "expired") && code === "" ? "error" : "idle";

  const [sentBefore, sentAfter = ""] = (channel === "email" ? t.sentEmail : t.sentWhatsApp).split("{to}");
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const resendNow = () => {
    setLatest("resend");
    startTransition(resendAction);
  };

  return (
    <div className="flex flex-col">
      <span className="mb-5 inline-flex h-7 items-center gap-2 self-start rounded-pill bg-green-50 pr-3 pl-2.5 text-caption font-semibold text-green-700">
        <i aria-hidden className="size-1.5 rounded-pill bg-green-500" />
        {t.eyebrow}
      </span>
      <h1 className="type-signin text-balance text-ink">{t.title}</h1>
      {/* Normal wrapping, as in the target: "pretty" would push the address down to keep "Change" company. */}
      <p className="type-signin-lead mt-3 text-wrap text-ink-2">
        {sentBefore}
        <b className="font-semibold text-ink">{to}</b>
        {sentAfter}{" "}
        <Link href="/auth" className="font-semibold text-green-700 hover:underline">
          {t.change}
        </Link>
      </p>

      <form ref={formRef} action={verifyAction} onSubmit={() => setLatest("verify")} noValidate className="mt-6 flex flex-col lg:mt-8">
        <CodeInput
          id="auth-code"
          name="code"
          length={length}
          label={fill(t.label, { count: length })}
          value={code}
          onChange={change}
          state={inputState}
          attempt={verify.attempt}
          disabled={blocked || done}
          autoFocus
          describedBy={message ? "auth-code-message" : undefined}
        />
        {message ? (
          <p id="auth-code-message" role="alert" className="mt-helper flex items-center gap-1 text-caption text-danger">
            <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {message}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="mt-helper flex items-center gap-1 text-caption text-success">
            <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {t.done}
          </p>
        ) : latest === "resend" && resend.status === "sent" ? (
          <p role="status" className="mt-helper flex items-center gap-1 text-caption text-success">
            <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {t.resent}
          </p>
        ) : null}
      </form>

      {online ? null : (
        <p role="status" className="mt-6 flex items-start gap-2 rounded-inner bg-warning-100 p-4 text-body text-ink">
          <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.75} />
          {t.offline}
        </p>
      )}

      {blocked ? (
        // With no tries left, or the code expired, getting a new code is the one thing to do.
        <Button className="mt-6 w-full text-control font-bold" disabled={!online} loading={resending} loadingLabel={t.checking} onClick={resendNow}>
          {t.resend}
        </Button>
      ) : done ? null : (
        <div className="mt-4 flex flex-col gap-1 text-label leading-4 font-medium text-ink-2 lg:flex-row lg:items-center lg:justify-between">
          <span>{t.resendHint}</span>
          {seconds > 0 ? (
            <span className="tabular font-semibold text-ink-3" aria-live="off">
              {fill(t.resendIn, { time })}
            </span>
          ) : (
            <Button variant="tertiary" size="text" className="min-h-11 self-start text-label font-semibold lg:self-auto" disabled={!online} loading={resending} loadingLabel={t.checking} onClick={resendNow}>
              {t.resend}
            </Button>
          )}
        </div>
      )}

      {blocked || done ? null : (
        <p className="mt-5 flex items-center gap-2 text-label leading-4 font-medium text-wrap text-ink-2">
          <ShieldCheck aria-hidden className="size-4 shrink-0 text-green-700" strokeWidth={1.75} />
          {t.note}
        </p>
      )}
    </div>
  );
}
