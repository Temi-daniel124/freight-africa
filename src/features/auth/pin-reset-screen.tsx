"use client";

import { useCallback, useState } from "react";
import messages from "@/messages/en.json";
import { PinKeypad, type KeypadAnswer } from "./pin-keypad";
import { resetPinWithLink } from "./pin-reset-actions";
import { pinIsWeak } from "./pin-rules";

const t = messages.auth.pin;

/** D044: a phone-invited member's new PIN, from the link their owner shared. */
export function PinResetScreen({ token, name }: { token: string; name: string }) {
  const [first, setFirst] = useState<string | null>(null);
  const [used, setUsed] = useState(false);
  const complete = useCallback(
    async (pin: string): Promise<KeypadAnswer> => {
      if (first === null) {
        if (pinIsWeak(pin)) return { error: t.weak, shake: true };
        setFirst(pin);
        return;
      }
      if (pin !== first) {
        setFirst(null);
        return { error: t.mismatch, shake: true };
      }
      const result = await resetPinWithLink(token, pin);
      if (result.status === "ok") {
        window.location.assign(result.next);
        return { clear: false };
      }
      setFirst(null);
      if (result.status === "used") setUsed(true);
      return { error: result.status === "weak" ? t.weak : result.status === "used" ? messages.auth.reset.used : t.failed };
    },
    [first, token],
  );
  return (
    <PinKeypad
      title={first === null ? t.setTitle : t.confirmTitle}
      lead={messages.auth.reset.lead.replace("{name}", name)}
      onComplete={complete}
      stepKey={first === null ? "first" : "second"}
      blocked={used ? <p className="text-center text-body text-ink-2">{messages.auth.reset.used}</p> : undefined}
    />
  );
}
