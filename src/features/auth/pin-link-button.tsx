"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { makePinResetLink } from "./pin-reset-actions";

const t = messages.drivers.pinLink;

/** D044 "Send a new PIN link" for a member invited by phone; the owner shares it from their own WhatsApp. */
export function PinLinkButton({ orgId, memberId, name }: { orgId: string; memberId: string; name: string }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  if (link) {
    const message = t.message.replace("{link}", link);
    return (
      <div className="flex w-full flex-col gap-2 rounded-inner bg-paper p-3">
        <p className="text-label font-normal text-ink-2">{t.text.replace("{name}", name)}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <MessageCircle aria-hidden strokeWidth={1.75} />
            {t.share}
          </a>
          <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}>
            {copied ? <Check aria-hidden strokeWidth={2} /> : <Copy aria-hidden strokeWidth={1.75} />}
            {copied ? t.copied : t.copy}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() =>
          start(async () => {
            const result = await makePinResetLink(orgId, memberId);
            if (result.status === "ok") setLink(result.link);
            else setFailed(true);
          })
        }
      >
        {t.button}
      </Button>
      {failed ? <p role="alert" className="w-full text-label text-danger">{t.failed}</p> : null}
    </>
  );
}
