import { createHash } from "node:crypto";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PinResetScreen } from "@/features/auth/pin-reset-screen";
import { supabaseAdmin } from "@/lib/supabase/admin";
import messages from "@/messages/en.json";

async function Reset({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: name } = await supabaseAdmin().rpc("peek_pin_reset_link", { p_token_hash: createHash("sha256").update(token).digest("hex") });
  if (!name) {
    return (
      <div className="mx-auto max-w-100 p-6">
        <EmptyState title={messages.auth.reset.usedTitle}>{messages.auth.reset.used}</EmptyState>
      </div>
    );
  }
  return <PinResetScreen token={token} name={name.split(/\s+/)[0] ?? name} />;
}

// D044: "Send a new PIN link" (a phone-invited member forgot their PIN).
export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none md:h-140 md:w-100 md:rounded-card" />}>
      <Reset params={params} />
    </Suspense>
  );
}
