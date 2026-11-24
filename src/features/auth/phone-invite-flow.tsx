"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import messages from "@/messages/en.json";
import { acceptPhoneInvite } from "./phone-invite-actions";
import { PinKeypad, type KeypadAnswer } from "./pin-keypad";
import { pinIsWeak } from "./pin-rules";

const t = messages.org.invite;
const p = messages.auth.pin;

/** A-07 by phone (D044): confirm your name, choose a PIN twice; the account is made with the invited number. */
export function PhoneInviteFlow({ token, line }: { token: string; line: string }) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [step, setStep] = useState<"name" | "first" | "second">("name");
  const [first, setFirst] = useState("");
  const [closed, setClosed] = useState<string | null>(null);

  const complete = useCallback(
    async (pin: string): Promise<KeypadAnswer> => {
      if (step === "first") {
        if (pinIsWeak(pin)) return { error: p.weak, shake: true };
        setFirst(pin);
        setStep("second");
        return;
      }
      if (pin !== first) {
        setStep("first");
        return { error: p.mismatch, shake: true };
      }
      const result = await acceptPhoneInvite(token, name, pin);
      if (result.status === "ok") {
        window.location.assign(result.next);
        return { clear: false };
      }
      if (result.status === "weak") {
        setStep("first");
        return { error: p.weak, shake: true };
      }
      if (result.status === "name") {
        setStep("name");
        setNameError(true);
        return;
      }
      setClosed(result.status === "exists" ? t.phoneExists : result.status === "closed" ? t.closedTitle : p.failed);
      return { error: result.status === "error" ? p.failed : undefined };
    },
    [first, name, step, token],
  );

  if (closed) {
    return <p className="text-center text-body text-ink">{closed}</p>;
  }

  if (step === "name") {
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length < 2) {
            setNameError(true);
            return;
          }
          setStep("first");
        }}
      >
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-title-1 text-ink">{t.title}</h1>
          <p className="text-body text-ink-2">{line}</p>
        </div>
        <TextField
          id="invite-name"
          name="name"
          label={t.nameLabel}
          helper={t.nameHelp}
          autoComplete="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(false);
          }}
          error={nameError ? t.nameError : undefined}
        />
        <Button type="submit" className="w-full">
          {t.choosePin}
        </Button>
      </form>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper md:grid md:place-items-center">
      <PinKeypad title={step === "first" ? p.setTitle : p.confirmTitle} lead={t.pinLead} onComplete={complete} stepKey={step} />
    </div>
  );
}
