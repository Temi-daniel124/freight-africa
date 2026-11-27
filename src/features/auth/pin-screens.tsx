"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import messages from "@/messages/en.json";
import { AuthTop, StepLabel } from "./auth-frame";
import { chooseNewPin, forgotPin, signInWithPin, signOutToStart, unlockApp } from "./pin-actions";
import { PinKeypad, type KeypadAnswer } from "./pin-keypad";
import { useTurnstile } from "./turnstile-field";

const t = messages.auth.pin;

function wrongText(left: number) {
  return left === 1 ? t.wrongOne : t.wrong.replace("{left}", String(left));
}

/** Full navigation, so the new session cookies are read by the next page. */
function go(path: string) {
  window.location.assign(path);
}

/** "a•••••e@okaforfoods.ng": enough to recognise, not enough to read out (P05c). */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain || name.length < 2) return email;
  return `${name[0]}•••••${name[name.length - 1]}@${domain}`;
}

/**
 * P05c: five wrong PINs lock PIN sign-in. One way on (a code by email, then a new PIN) and help. People
 * invited by phone have no email, so they are told to ask for a new PIN link instead.
 */
export function PinLocked({ email, back, action }: { email: string | null; back: string; action: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-paper md:items-center md:justify-center md:px-4 md:py-24">
      <Logo variant="primary-green" className="absolute top-9 left-10 hidden h-7.5 w-auto md:block" />
      <div className="flex min-h-dvh w-full flex-col md:min-h-0 md:max-w-105 md:rounded-card md:border md:border-line md:bg-surface md:px-8 md:py-9 md:shadow-[0_40px_80px_-50px_rgba(15,26,20,0.5)]">
        <AuthTop back={back} middle={<span />} />
        <div className="flex flex-col items-center px-8 pt-15 text-center md:px-0 md:pt-0">
          <span aria-hidden className="grid size-24 place-items-center rounded-hero bg-warning-100 text-warning">
            <Lock className="size-11" strokeWidth={1.8} />
          </span>
          <h1 className="mt-5.5 text-title-1 text-ink">{t.lockedTitle}</h1>
          <p className="mt-2.5 text-body text-ink-2">{email ? t.lockedText : t.lockedPhone}</p>
          {email ? (
            <p className="mt-5.5 flex items-center gap-3 rounded-callout bg-green-50 px-4 py-3.5 text-left text-meta text-green-800">
              <Mail aria-hidden className="size-5 shrink-0 text-green-700" strokeWidth={1.8} />
              {t.lockedAlert.replace("{email}", maskEmail(email))}
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-col px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),30px)] md:mt-7 md:px-0 md:pb-0">
          {action}
          <a href={`mailto:${messages.site.contactEmail}`} className={buttonVariants({ variant: "tertiary", size: "text", className: "w-full" })}>
            {t.getHelp}
          </a>
        </div>
      </div>
    </div>
  );
}

/** "adaeze@okaforfoods.ng · Not you?" (D01b). */
function WhoLine({ login, onNotYou }: { login: string; onNotYou?: () => void }) {
  return (
    <>
      {login} ·{" "}
      {onNotYou ? (
        <button type="button" onClick={onNotYou} className="font-semibold text-green-700">
          {t.notYou}
        </button>
      ) : (
        <Link href="/auth?mode=signin" className="font-semibold text-green-700">
          {t.notYou}
        </Link>
      )}
    </>
  );
}

/** A-13 on a new device: the sign-in keypad, after the email or phone number. */
export function PinSignIn({ shownLogin, phone, turnstileSiteKey, avatar }: { shownLogin: string; phone: boolean; turnstileSiteKey: string | null; avatar?: React.ReactNode }) {
  const [blocked, setBlocked] = useState<"locked" | "none" | "phone" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsCheck, setNeedsCheck] = useState(false);
  const [pending, start] = useTransition();
  const [resets, setResets] = useState(0);
  const checkBox = useRef<HTMLFormElement>(null);
  const turnstile = useTurnstile(needsCheck ? turnstileSiteKey : null, resets);

  const complete = useCallback(
    async (pin: string): Promise<KeypadAnswer> => {
      const token = (checkBox.current?.elements.namedItem("captcha") as HTMLInputElement | null)?.value ?? "";
      const result = await signInWithPin(pin, token);
      if (token) setResets((n) => n + 1);
      switch (result.status) {
        case "ok":
          go(result.next);
          return { clear: false };
        case "twoStep":
          go(`/auth/two-step?next=${encodeURIComponent(result.next)}`);
          return { clear: false };
        case "wrong":
          if (turnstileSiteKey && result.left <= 3) setNeedsCheck(true);
          return { error: wrongText(result.left), shake: true };
        case "locked":
          setBlocked("locked");
          return { error: phone ? t.lockedPhone : t.locked, shake: true };
        case "none":
          setBlocked(phone ? "phone" : "none");
          return { error: phone ? t.phoneForgot : t.none };
        case "limited":
          return { error: t.limited, shake: true };
        case "captcha":
          setNeedsCheck(true);
          return { error: t.captcha };
        case "expired":
          go("/auth?mode=signin");
          return { clear: false };
        default:
          return { error: t.failed };
      }
    },
    [phone, turnstileSiteKey],
  );

  const sendCode = () =>
    start(async () => {
      const answer = await forgotPin();
      if (answer.status === "phone") setNotice(t.phoneForgot);
      else if (answer.status === "rateLimited") setNotice(t.rateLimited);
      else if (answer.status === "expired") go("/auth?mode=signin");
      else setNotice(t.failed);
    });

  if (blocked === "locked") {
    return (
      <PinLocked
        email={phone ? null : shownLogin}
        back="/auth?mode=signin"
        action={
          phone ? null : (
            <>
              {notice ? <p className="mb-3 text-center text-label text-ink-2">{notice}</p> : null}
              <Button onClick={sendCode} loading={pending} className="w-full">
                {t.lockedEmail}
              </Button>
            </>
          )
        }
      />
    );
  }

  const blockedView =
    blocked === "none" ? (
      phone ? (
        <p className="text-center text-body text-ink-2">{t.phoneForgot}</p>
      ) : (
        <Button onClick={sendCode} loading={pending} className="w-full">
          {t.noneAction}
        </Button>
      )
    ) : blocked === "phone" ? (
      <p className="text-center text-body text-ink-2">{t.phoneForgot}</p>
    ) : null;

  return (
    <PinKeypad
      title={t.signInTitle}
      lead={<WhoLine login={shownLogin} />}
      avatar={avatar}
      onComplete={complete}
      openLabel={t.open}
      blocked={
        blockedView ? (
          <>
            {blockedView}
            <Link href="/auth?mode=signin" className={buttonVariants({ variant: "tertiary", size: "text", className: "w-full" })}>
              {t.otherAccount}
            </Link>
          </>
        ) : undefined
      }
      forgot={{ label: t.forgot, onPress: phone ? () => setNotice(t.phoneForgot) : sendCode }}
      extra={
        notice || (needsCheck && turnstileSiteKey) ? (
          <>
            {notice ? <p className="max-w-80 text-label text-ink-2">{notice}</p> : null}
            {needsCheck && turnstileSiteKey ? <form ref={checkBox}>{turnstile.field}</form> : null}
          </>
        ) : undefined
      }
    />
  );
}

/** A-11 (P05): choose a PIN, entered twice. Step 2 of 3 for someone new. */
export function PinSet({ next, avatar }: { next: string; avatar?: React.ReactNode }) {
  const [first, setFirst] = useState<string | null>(null);
  const complete = useCallback(
    async (pin: string): Promise<KeypadAnswer> => {
      if (first === null) {
        setFirst(pin);
        return;
      }
      if (first !== pin) {
        setFirst(null);
        return { error: t.mismatch, shake: true };
      }
      const result = await chooseNewPin(pin, next);
      if (result.status === "ok") {
        go(result.next);
        return { clear: false };
      }
      setFirst(null);
      return { error: result.status === "weak" ? t.weak : result.status === "fresh" ? t.fresh : t.failed, shake: result.status === "weak" };
    },
    [first, next],
  );
  return (
    <PinKeypad
      large
      // The email code is behind this step already, so there is no Back: the header only says where you are.
      top={<AuthTop middle={<StepLabel n={2} />} />}
      title={first === null ? t.setTitle : t.confirmTitle}
      lead={t.setLead}
      avatar={avatar}
      onComplete={complete}
      stepKey={first === null ? "first" : "second"}
    />
  );
}

/** A-13 on the same device (P05b, D01b): the app locked; the PIN opens it. */
export function PinUnlock({ next, avatar, phone, name, email }: { next: string; avatar?: React.ReactNode; phone: boolean; name?: string; email?: string }) {
  const [locked, setLocked] = useState(false);
  const complete = useCallback(
    async (pin: string): Promise<KeypadAnswer> => {
      const result = await unlockApp(pin, next);
      if (result.status === "ok") {
        go(result.next);
        return { clear: false };
      }
      if (result.status === "wrong") return { error: wrongText(result.left), shake: true };
      if (result.status === "locked") {
        setLocked(true);
        return { error: phone ? t.lockedPhone : t.locked, shake: true };
      }
      return { error: t.failed };
    },
    [next, phone],
  );
  const signOut = () => void signOutToStart();
  if (locked) {
    return (
      <PinLocked
        email={phone ? null : (email ?? null)}
        back="/auth?mode=signin"
        action={
          <form action={signOutToStart} className="w-full">
            <Button type="submit" className="w-full">
              {phone ? t.otherAccount : t.lockedEmail}
            </Button>
          </form>
        }
      />
    );
  }
  const first = name?.split(/\s+/)[0];
  return (
    <PinKeypad
      title={first ? t.unlockNamed.replace("{name}", first) : t.unlockTitle}
      lead={
        <>
          <span className="md:hidden">{t.unlockLead}</span>
          <span className="hidden md:inline">{email && !phone ? <WhoLine login={email} onNotYou={signOut} /> : t.unlockLead}</span>
        </>
      }
      avatar={avatar}
      onComplete={complete}
      openLabel={t.open}
      corner={{ label: t.notYou, onPress: signOut }}
      forgot={phone ? undefined : { label: t.forgot, onPress: signOut }}
    />
  );
}
