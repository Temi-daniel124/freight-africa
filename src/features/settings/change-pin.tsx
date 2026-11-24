"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PinKeypad, type KeypadAnswer } from "@/features/auth/pin-keypad";
import { pinIsWeak } from "@/features/auth/pin-rules";
import messages from "@/messages/en.json";
import { changePin } from "./security-actions";

const t = messages.auth.pin;
const c = messages.settings.security;

/** Settings, Change PIN: current PIN, new PIN, new PIN again. */
export function ChangePin({ back }: { back: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"old" | "new" | "again">("old");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const complete = useCallback(
    async (pin: string): Promise<KeypadAnswer> => {
      if (step === "old") {
        setOldPin(pin);
        setStep("new");
        return;
      }
      if (step === "new") {
        if (pinIsWeak(pin)) return { error: t.weak, shake: true };
        setNewPin(pin);
        setStep("again");
        return;
      }
      if (pin !== newPin) {
        setStep("new");
        return { error: t.mismatch, shake: true };
      }
      const result = await changePin(oldPin, pin);
      if (result.status === "ok") {
        router.replace(`${back}?pin=changed`);
        return { clear: false };
      }
      setStep("old");
      if (result.status === "locked") {
        router.replace("/auth/unlock");
        return { clear: false };
      }
      return { error: result.status === "wrong" ? c.oldWrong : result.status === "weak" ? t.weak : t.failed, shake: true };
    },
    [back, newPin, oldPin, router, step],
  );
  const title = step === "old" ? c.oldTitle : step === "new" ? t.setTitle : t.confirmTitle;
  return <PinKeypad title={title} lead={step === "old" ? c.oldLead : t.setLead} onComplete={complete} stepKey={step} />;
}
