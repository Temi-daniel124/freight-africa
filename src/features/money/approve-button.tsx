"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import messages from "@/messages/en.json";
import { approveMoneyOut } from "./finance-actions";

/** A second finance person approves a large payout or refund, with a reason (the database refuses the requester). */
export function ApproveButton({ kind, id }: { kind: "payout" | "refund"; id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const a = messages.staffAdmin;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {messages.finance.approve}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={messages.finance.approve}
        description={a.approvals.moneyEffect}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {a.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={reason.trim().length < 5}
              onClick={() =>
                start(async () => {
                  const ok = await approveMoneyOut(kind, id, reason);
                  if (!ok) toast.error(messages.finance.approveFailed);
                  else setOpen(false);
                  router.refresh();
                })
              }
            >
              {a.confirm}
            </Button>
          </>
        }
      >
        <label className="text-label text-ink">
          {a.reason}
          <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-input border border-line-field px-3 py-2.5 text-control outline-none focus:border-green-700" />
        </label>
      </Dialog>
    </>
  );
}
