"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import messages from "@/messages/en.json";
import { setIDrive } from "./actions";

const t = messages.settings.driving;

/** "I drive my own truck" in Settings (D043): adds or removes the Drive tab. */
export function DriveSwitch({ orgId, drives }: { orgId: string; drives: boolean }) {
  const [, start] = useTransition();
  const [on, setOn] = useOptimistic(drives);
  return (
    <Switch
      id="settings-drives"
      label={t.label}
      help={t.help}
      checked={on}
      onChange={(next) =>
        start(async () => {
          setOn(next);
          const { ok } = await setIDrive(orgId, next);
          if (!ok) toast.error(t.failed);
        })
      }
    />
  );
}
