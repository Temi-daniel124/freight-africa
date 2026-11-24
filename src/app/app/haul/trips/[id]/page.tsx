import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnerTripPage } from "@/features/booking/owner-trips";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.trips.details };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  return <OwnerTripPage id={(await params).id} />;
}

// T-08: one trip for the truck business.
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="owner" title={messages.trips.details}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
