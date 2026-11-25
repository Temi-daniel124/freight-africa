"use client";

import { ArrowRight, CircleAlert, Mail, ShieldCheck, WifiOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import messages from "@/messages/en.json";
import { Button } from "@/components/ui/button";
import { PhoneField } from "@/components/ui/phone-field";
import { useOnline } from "@/lib/use-online";
import { sendCode, signInWithGoogle } from "./actions";
import type { CodeChannel } from "./schema";
import type { SendState } from "./state";
import { useTurnstile } from "./turnstile-field";

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
  offline: string;
  eyebrow: string;
  codeNote: string;
  agree: string;
  termsLink: string;
  privacyLink: string;
  errors: { email: string; phone: string; rateLimited: string; captcha: string; failed: string; google: string };
};

type SignInFormProps = {
  t: SignInText;
  options: { google: boolean; whatsapp: boolean };
  next: string;
  googleFailed: boolean;
  /** Cloudflare Turnstile site key, or null while the bot check is switched off. */
  turnstileSiteKey: string | null;
  /** Preview-only: start in a given state (the /dev/sign-in page). Never set on the real page. */
  preview?: { state?: SendState; offline?: boolean; sending?: boolean };
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
export function SignInForm({ t, options, next, googleFailed, turnstileSiteKey, preview }: SignInFormProps) {
  const online = useOnline() && !preview?.offline;
  const [channel, setChannel] = useState<CodeChannel>(options.whatsapp ? "whatsapp" : "email");
  const initial: SendState = { status: "idle", channel, value: "", attempt: 0 };
  const [state, action, pending] = useActionState(sendCode, preview?.state ?? initial);
  const turnstile = useTurnstile(turnstileSiteKey, state.attempt);

  // Messages from the last attempt only apply to the method that attempt used.
  const current = state.channel === channel ? state : initial;
  const banner =
    current.status === "rate_limited" ? t.errors.rateLimited : current.status === "captcha" ? t.errors.captcha : current.status === "error" ? t.errors.failed : googleFailed ? t.errors.google : null;
  const [before, between, after] = splitAgree(t.agree);

  return (
    <div className="flex flex-col">
      <span className="mb-5 inline-flex h-7 items-center gap-2 self-start rounded-pill bg-green-50 pr-3 pl-2.5 text-caption font-semibold text-green-700">
        <i aria-hidden className="size-1.5 rounded-pill bg-green-500" />
        {t.eyebrow}
      </span>
      <h1 className="type-signin text-balance text-ink">{t.title}</h1>
      <p className="type-signin-lead mt-3 text-wrap text-ink-2">{t.lead}</p>

      {banner ? (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-inner bg-danger-100 p-4 text-body text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          {banner}
        </p>
      ) : null}

      {online ? null : (
        <p role="status" className="mt-6 flex items-start gap-2 rounded-inner bg-warning-100 p-4 text-body text-ink">
          <WifiOff aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.75} />
          {t.offline}
        </p>
      )}

      {options.google ? (
        <>
          <form action={signInWithGoogle} className="mt-6 lg:mt-8">
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-button border border-line-strong bg-surface text-control font-semibold text-ink transition-colors motion-instant hover:bg-green-50 active:scale-press"
            >
              <GoogleMark />
              {t.google}
            </button>
          </form>
          <div className="mt-6 flex items-center gap-4 text-caption text-ink-2">
            <span aria-hidden className="h-px flex-1 bg-line" />
            {t.or}
            <span aria-hidden className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      <form action={action} onSubmit={turnstile.onSubmit} noValidate className="mt-6 flex flex-col lg:mt-8">
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
          <EmailField
            key={`email-${current.attempt}`}
            label={t.emailLabel}
            placeholder={t.emailPlaceholder}
            defaultValue={current.value}
            error={current.status === "invalid" ? t.errors.email : undefined}
          />
        )}
        {turnstile.field}
        <Button
          type="submit"
          className="mt-4 w-full text-control font-semibold"
          disabled={!online}
          loading={pending || turnstile.holding || preview?.sending}
          loadingLabel={t.sending}
        >
          {channel === "whatsapp" ? t.sendWhatsApp : t.sendEmail}
          <ArrowRight aria-hidden className="size-4.5" strokeWidth={1.75} />
        </Button>
      </form>

      <p className="mt-5 flex items-center gap-2 text-label leading-4 font-medium text-wrap text-ink-2">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-green-700" strokeWidth={1.75} />
        {t.codeNote}
      </p>

      {options.whatsapp ? (
        <Button variant="tertiary" size="text" className="mt-2 self-start" onClick={() => setChannel(channel === "whatsapp" ? "email" : "whatsapp")}>
          {channel === "whatsapp" ? t.useEmail : t.usePhone}
        </Button>
      ) : null}

      <p className="mt-6 text-body-sm text-ink-2">
        {messages.auth.signin.haveAccount}{" "}
        <Link href={`/auth?mode=signin&next=${encodeURIComponent(next)}`} className="font-semibold text-green-700">
          {messages.auth.signin.signInLink}
        </Link>
      </p>

      <p className="mt-8 border-t border-line pt-5 text-caption leading-4.5 text-wrap text-ink-3">
        {before}
        {/* Plain links: the legal pages live on the website's host, so the app must not prefetch them (CSP). */}
        <a href="/legal/terms" className="font-semibold text-ink-2 underline underline-offset-2">
          {t.termsLink}
        </a>
        {between}
        <a href="/legal/privacy" className="font-semibold text-ink-2 underline underline-offset-2">
          {t.privacyLink}
        </a>
        {after}
      </p>
    </div>
  );
}

/** The 56 px email field with a mail icon (Gate 1 target). */
function EmailField({ label, placeholder, defaultValue, error }: { label: string; placeholder: string; defaultValue: string; error?: string }) {
  return (
    <div className="flex flex-col">
      <label htmlFor="auth-email" className="mb-2 text-label text-ink">
        {label}
      </label>
      <div className="relative">
        <Mail aria-hidden className="pointer-events-none absolute top-4 left-4 size-5 text-ink-3" strokeWidth={1.75} />
        <input
          id="auth-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "auth-email-error" : undefined}
          className="h-14 w-full rounded-input border border-line-strong bg-surface pr-4 pl-12 text-control text-ink transition outline-none motion-instant placeholder:text-ink-3 focus:border-green-700 focus:ring-4 focus:ring-green-500/16 aria-invalid:border-danger aria-invalid:focus:ring-danger-100"
        />
      </div>
      {error ? (
        <p id="auth-email-error" className="mt-helper flex items-center gap-1 text-caption text-danger">
          <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Splits "By continuing you agree to the {terms} and {privacy}." around its two links. */
function splitAgree(text: string): [string, string, string] {
  const [before, rest = ""] = text.split("{terms}");
  const [between, after = ""] = rest.split("{privacy}");
  return [before, between, after];
}
