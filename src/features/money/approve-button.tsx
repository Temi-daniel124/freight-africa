"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import messages from "@/messages/en.json";
import { approveMoneyOut } from "./finance-actions";

/** A second finance person approves a large payout or refund (the database refuses the requester). */
export function ApproveButton({ kind, id }: { kind: "payout" | "refund"; id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const ok = await approveMoneyOut(kind, id);
          if (!ok) toast.error(messages.finance.approveFailed);
          router.refresh();
        })
      }
    >
      {messages.finance.approve}
    </Button>
  );
}
