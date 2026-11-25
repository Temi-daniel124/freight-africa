"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import messages from "@/messages/en.json";
import { confirmFresh, freshMethod, sendFreshCode, type FreshMethod } from "./fresh-actions";

const t = messages.auth.fresh;

/** "Confirm it's you" (D044): the authenticator code, or an email code; then onDone runs the action again. */
export function FreshCheck({ onDone }: { onDone: () => void }) {
  const [method, setMethod] = useState<FreshMethod | null>(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    void freshMethod().then(setMethod);
  }, []);
  if (!method) return null;
  if (method === "none") return <p className="text-body-sm text-ink-2">{t.none}</p>;
  const submit = (value: string) =>
    start(async () => {
      const result = await confirmFresh(value);
      if (result.status === "ok") onDone();
      else {
        setCode("");
        setError(result.status === "twoStepLocked" ? t.twoStepLocked : result.status === "locked" ? t.locked : result.status === "wrong" ? t.wrong : t.failed);
      }
    });
  return (
    <div className="flex flex-col gap-3 rounded-inner bg-paper p-4">
      <p className="text-body-sm font-semibold text-ink">{t.title}</p>
      <p className="text-label font-normal text-ink-2">{method === "totp" ? t.totp : sent ? t.emailSent : t.email}</p>
      {method === "email" && !sent ? (
        <Button
          size="md"
          variant="secondary"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await sendFreshCode();
              if (r.status === "sent") setSent(true);
              else setError(r.status === "rateLimited" ? messages.auth.pin.rateLimited : t.failed);
            })
          }
        >
          {t.send}
        </Button>
      ) : (
        <CodeInput
          id="fresh-code"
          name="code"
          length={6}
          label={t.label}
          value={code}
          attempt={0}
          state={error ? "error" : "idle"}
          disabled={pending}
          autoFocus
          onChange={(value) => {
            setCode(value);
            setError(null);
            if (value.length === 6) submit(value);
          }}
        />
      )}
      {error ? <p role="alert" className="text-label text-danger">{error}</p> : null}
    </div>
  );
}
