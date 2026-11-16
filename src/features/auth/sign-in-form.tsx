"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { sendCode, signInWithGoogle } from "./actions";
import type { CodeChannel } from "./schema";
import type { SendState } from "./state";

export type SignInText = {
  title: string;
  lead: string;
  google: string;
  or: string;
  phoneLabel: string;
  sendWhatsApp: string;
  useEmail: string;
  usePhone: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendEmail: string;
  sending: string;
  agree: string;
  termsLink: string;
  privacyLink: string;
  errors: { email: string; phone: string; rateLimited: string; failed: string; google: string };
};

type SignInFormProps = {
  t: SignInText;
  options: { google: boolean; whatsapp: boolean };
  next: string;
  googleFailed: boolean;
};

// Google's mark keeps Google's own colours (their brand rules), so these four are not design tokens.
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-5 shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

// A-01: Google (when switched on), then a code on WhatsApp (when switched on) or by email.
export function SignInForm({ t, options, next, googleFailed }: SignInFormProps) {
  const [channel, setChannel] = useState<CodeChannel>(options.whatsapp ? "whatsapp" : "email");
  const initial: SendState = { status: "idle", channel, value: "", attempt: 0 };
  const [state, action, pending] = useActionState(sendCode, initial);

  // Messages from the last attempt only apply to the method that attempt used.
  const current = state.channel === channel ? state : initial;
  const banner =
    current.status === "rate_limited" ? t.errors.rateLimited : current.status === "error" ? t.errors.failed : googleFailed ? t.errors.google : null;
  const [before, between, after] = splitAgree(t.agree);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.lead}</p>
      </div>

      {banner ? (
        <p role="alert" className="flex items-start gap-2 rounded-inner bg-danger-100 p-4 text-body text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          {banner}
        </p>
      ) : null}

      {options.google ? (
        <>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-button border border-line-strong bg-surface text-body-lg font-semibold text-ink transition-colors motion-instant hover:bg-green-50 active:scale-press"
            >
              <GoogleMark />
              {t.google}
            </button>
          </form>
          <div className="flex items-center gap-4 text-caption text-ink-2">
            <span aria-hidden className="h-px flex-1 bg-line" />
            {t.or}
            <span aria-hidden className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      <form action={action} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="channel" value={channel} />
        <input type="hidden" name="next" value={next} />
        {channel === "whatsapp" ? (
          <PhoneField
            key={`phone-${current.attempt}`}
            id="auth-phone"
            name="phone"
            label={t.phoneLabel}
            defaultValue={current.value}
            error={current.status === "invalid" ? t.errors.phone : undefined}
            required
          />
        ) : (
          <TextField
            key={`email-${current.attempt}`}
            id="auth-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            label={t.emailLabel}
            placeholder={t.emailPlaceholder}
            defaultValue={current.value}
            error={current.status === "invalid" ? t.errors.email : undefined}
            required
          />
        )}
        <Button type="submit" className="w-full" loading={pending} loadingLabel={t.sending}>
          {channel === "whatsapp" ? t.sendWhatsApp : t.sendEmail}
        </Button>
      </form>

      {options.whatsapp ? (
        <Button variant="tertiary" size="text" className="self-center" onClick={() => setChannel(channel === "whatsapp" ? "email" : "whatsapp")}>
          {channel === "whatsapp" ? t.useEmail : t.usePhone}
        </Button>
      ) : null}

      <p className="text-center text-caption text-ink-2">
        {before}
        <Link href="/legal/terms" className="font-semibold text-green-700 underline">
          {t.termsLink}
        </Link>
        {between}
        <Link href="/legal/privacy" className="font-semibold text-green-700 underline">
          {t.privacyLink}
        </Link>
        {after}
      </p>
    </div>
  );
}

/** Splits "By continuing you agree to the {terms} and {privacy}." around its two links. */
function splitAgree(text: string): [string, string, string] {
  const [before, rest = ""] = text.split("{terms}");
  const [between, after = ""] = rest.split("{privacy}");
  return [before, between, after];
}
