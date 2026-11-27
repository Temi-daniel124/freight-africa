import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerPayout } from "@/features/owner/earnings";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.ownerEarnings.payouts };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  return <OwnerPayout id={(await params).id} />;
}

// O17b one payout (owners and Admins; RLS: see_money).
export default function PayoutPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="owner" title={messages.ownerEarnings.payouts}>
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
