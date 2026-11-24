import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SenderTripPage } from "@/features/booking/trip-page";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.trips.details };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SenderTripPage id={id} />;
}

// S-04 to S-07: one of the sender's trips (status, pay, offers, details, cancel, receipt).
export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="shipper" title={messages.trips.details}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
