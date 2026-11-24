"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import messages from "@/messages/en.json";
import { decideFleet, decideIdentity, type DecideState } from "./staff-actions";

const t = messages.shell.staff.verification;

/** Approve, or Decline with a reason the person reads. */
export function DecideForm({ session, kind = "identity" }: { session: string; kind?: "identity" | "truck" | "document" }) {
  const [state, action, pending] = useActionState(kind === "identity" ? decideIdentity : decideFleet, { status: "idle", attempt: 0 } satisfies DecideState);
  const [declining, setDeclining] = useState(false);
  if (state.status === "done") return <p className="text-body-sm font-semibold text-success">{t.decided}</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="kind" value={kind} />
      {declining ? (
        <TextField
          id={`reason-${session}`}
          name="reason"
          label={t.reason}
          placeholder={t.reasonPlaceholder}
          maxLength={300}
          autoFocus
          error={state.status === "needReason" ? t.needReason : undefined}
        />
      ) : null}
      {state.status === "error" ? <p className="text-label font-medium text-danger">{t.failed}</p> : null}
      <div className="flex flex-wrap gap-2">
        {declining ? (
          <Button type="submit" name="decision" value="decline" variant="secondary" size="md" loading={pending}>
            {t.decline}
          </Button>
        ) : (
          <>
            <Button type="submit" name="decision" value="approve" size="md" loading={pending}>
              {t.approve}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setDeclining(true)}>
              {t.decline}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
