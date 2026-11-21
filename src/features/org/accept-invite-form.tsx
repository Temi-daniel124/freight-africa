"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import messages from "@/messages/en.json";
import { acceptInvite, type ActionState } from "./actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInvite, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {state.message ? (
        <p role="alert" className="flex items-start gap-1.5 text-label font-medium text-danger">
          <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="md" className="w-full" loading={pending} loadingText loadingLabel={messages.org.team.sending}>
        {messages.org.invite.accept}
      </Button>
    </form>
  );
}
