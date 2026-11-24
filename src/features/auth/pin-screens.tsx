"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import messages from "@/messages/en.json";
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

  const blockedView =
    blocked === "locked" || blocked === "none" ? (
      phone ? (
        <p className="text-center text-body text-ink-2">{t.phoneForgot}</p>
      ) : (
        <Button onClick={sendCode} loading={pending} className="w-full">
          {blocked === "locked" ? t.lockedAction : t.noneAction}
        </Button>
      )
    ) : blocked === "phone" ? (
      <p className="text-center text-body text-ink-2">{t.phoneForgot}</p>
    ) : null;

  return (
    <PinKeypad
      title={t.signInTitle}
      lead={t.signInLead.replace("{login}", shownLogin)}
      avatar={avatar}
      onComplete={complete}
      blocked={blockedView ? <>{blockedView}<Link href="/auth?mode=signin" className={buttonVariants({ variant: "tertiary", size: "text", className: "w-full" })}>{t.otherAccount}</Link></> : undefined}
      forgot={{ label: t.forgot, onPress: phone ? () => setNotice(t.phoneForgot) : sendCode }}
      extra={
        <>
          {notice ? <p className="max-w-80 text-label text-ink-2">{notice}</p> : null}
          {needsCheck && turnstileSiteKey ? <form ref={checkBox}>{turnstile.field}</form> : null}
          <Link href="/auth?mode=signin" className="text-label font-semibold text-green-700 underline-offset-4 hover:underline">
            {t.otherAccount}
          </Link>
        </>
      }
    />
  );
}

/** A-11: choose a PIN, entered twice. */
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
  return <PinKeypad title={first === null ? t.setTitle : t.confirmTitle} lead={t.setLead} avatar={avatar} onComplete={complete} stepKey={first === null ? "first" : "second"} />;
}

/** A-13 on the same device: the app locked; the PIN opens it. */
export function PinUnlock({ next, avatar, phone }: { next: string; avatar?: React.ReactNode; phone: boolean }) {
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
  const signOut = (
    <form action={signOutToStart} className="w-full">
      <Button type="submit" variant={locked ? "primary" : "tertiary"} size={locked ? "lg" : "text"} className="w-full">
        {locked ? t.lockedAction : t.forgot}
      </Button>
    </form>
  );
  return (
    <PinKeypad
      title={t.unlockTitle}
      lead={t.unlockLead}
      avatar={avatar}
      onComplete={complete}
      blocked={locked ? signOut : undefined}
      forgot={phone ? undefined : { label: t.forgot, onPress: () => void signOutToStart() }}
    />
  );
}
