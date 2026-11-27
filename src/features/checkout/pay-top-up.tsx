"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { payTopUp } from "./actions";
import { checkoutMessage } from "./screens";

/** A difference to pay goes through the hosted checkout like every payment (D048). */
export function PayTopUpButton({ paymentId, label }: { paymentId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full"
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await payTopUp(paymentId);
          if (result.status === "ok") window.location.assign(result.url);
          else toast.error(checkoutMessage(result));
        })
      }
    >
      {label}
    </Button>
  );
}
