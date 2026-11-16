"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { resendCode, verifyCode } from "./actions";
import type { ResendState, VerifyState } from "./state";

export type CodeText = {
  title: string;
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
  rateLimited: string;
  failed: string;
  done: string;
};

type CodeFormProps = { t: CodeText; channel: "email" | "whatsapp"; to: string; length: number };

const RESEND_SECONDS = 30;
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

// A-02: enter the code. A full code is sent as soon as it's typed or pasted; a wrong one shakes the boxes;
// five wrong tries need a new code; "Resend code" unlocks after 30 seconds.
export function CodeForm({ t, channel, to, length }: CodeFormProps) {
  const reduced = usePrefersReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [verify, verifyAction, verifying] = useActionState(verifyCode, { status: "idle", attempt: 0 } satisfies VerifyState);
  const [resend, resendAction, resending] = useActionState(resendCode, { status: "idle", attempt: 0 } satisfies ResendState);

  // What the person last did decides which message shows: a wrong code, or a new code being sent.
  const [latest, setLatest] = useState<"verify" | "resend">("verify");
  const done = verify.status === "ok";
  const locked = latest === "verify" && verify.status === "locked";

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  // When a result comes back, reset the boxes during render (React: "adjusting state when a prop changes"),
  // so there is no extra paint with the old digits.
  const [seenVerify, setSeenVerify] = useState(0);
  if (verify.attempt !== seenVerify) {
    setSeenVerify(verify.attempt);
    // A wrong code clears the boxes for the next try.
    if (verify.status === "wrong" || verify.status === "locked") setCode("");
  }
  const [seenResend, setSeenResend] = useState(0);
  if (resend.attempt !== seenResend) {
    setSeenResend(resend.attempt);
    // A new code restarts the wait and clears the boxes.
    if (resend.status === "sent") {
      setCode("");
      setSeconds(RESEND_SECONDS);
    }
  }

  // Right code: the boxes turn green one after another, then the app opens.
  useEffect(() => {
    if (!done || !verify.next) return;
    const next = verify.next;
    const id = window.setTimeout(() => window.location.replace(next), reduced ? 0 : 400 + length * 60);
    return () => window.clearTimeout(id);
  }, [done, verify.next, reduced, length]);

  const change = (value: string) => {
    setCode(value);
    if (value.length === length && !verifying && !done) {
      setLatest("verify");
      // Wait for React to put the value in the field before sending the form.
      window.setTimeout(() => formRef.current?.requestSubmit(), 0);
    }
  };

  const message =
    latest === "resend"
      ? resend.status === "rate_limited"
        ? t.rateLimited
        : resend.status === "error"
          ? t.failed
          : null
      : verify.status === "wrong"
        ? t.wrong
        : verify.status === "locked"
          ? t.locked
          : verify.status === "error"
            ? t.failed
            : null;
  const inputState = done ? "success" : latest === "verify" && (verify.status === "wrong" || verify.status === "locked") && code === "" ? "error" : "idle";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">
          {fill(channel === "email" ? t.sentEmail : t.sentWhatsApp, { to })}{" "}
          <Link href="/auth" className="font-semibold text-green-700 hover:underline">
            {t.change}
          </Link>
        </p>
      </div>

      <form ref={formRef} action={verifyAction} onSubmit={() => setLatest("verify")} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-helper">
          <CodeInput
            id="auth-code"
            name="code"
            length={length}
            label={fill(t.label, { count: length })}
            value={code}
            onChange={change}
            state={inputState}
            attempt={verify.attempt}
            disabled={locked || done}
            autoFocus
            describedBy={message ? "auth-code-message" : undefined}
          />
          {message ? (
            <p id="auth-code-message" role="alert" className="flex items-center gap-1 text-caption text-danger">
              <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              {message}
            </p>
          ) : null}
          {done ? (
            <p role="status" className="flex items-center gap-1 text-caption text-success">
              <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              {t.done}
            </p>
          ) : latest === "resend" && resend.status === "sent" ? (
            <p role="status" className="flex items-center gap-1 text-caption text-success">
              <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              {t.resent}
            </p>
          ) : null}
        </div>

        {locked ? (
          // With no tries left, getting a new code is the one thing to do, so it becomes the main button.
          <Button
            className="w-full"
            loading={resending}
            loadingLabel={t.checking}
            onClick={() => {
              setLatest("resend");
              startTransition(resendAction);
            }}
          >
            {t.resend}
          </Button>
        ) : (
          <Button type="submit" className="w-full" loading={verifying || done} loadingLabel={t.checking}>
            {t.submit}
          </Button>
        )}
      </form>

      {locked || done ? null : seconds > 0 ? (
        <p className="tabular flex min-h-12 items-center self-center text-body font-semibold text-ink-2" aria-live="off">
          {fill(t.resendIn, { seconds })}
        </p>
      ) : (
        <Button
          variant="tertiary"
          size="text"
          className="self-center"
          loading={resending}
          loadingLabel={t.checking}
          onClick={() => {
            setLatest("resend");
            startTransition(resendAction);
          }}
        >
          {t.resend}
        </Button>
      )}
    </div>
  );
}
