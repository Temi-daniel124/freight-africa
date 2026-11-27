import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SenderTripPage } from "@/features/booking/trip-page";
import { findingProps } from "@/features/checkout/data";
import { FindingView } from "@/features/checkout/finding";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.trips.details };

async function Body({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ details?: string }> }) {
  const [{ id }, { details }] = await Promise.all([params, searchParams]);
  // P11 / D08: a paid booking still waiting for a truck opens on Finding your truck ("View trip" shows the rest).
  const finding = details ? null : await findingProps(id);
  if (finding) return <FindingView {...finding} />;
  return <SenderTripPage id={id} />;
}

// S-04 to S-07: one of the sender's trips (status, pay, offers, details, cancel, receipt).
export default function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ details?: string }> }) {
  return (
    <ShellSubpage role="shipper" title={messages.trips.details}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Body params={params} searchParams={searchParams} />
      </Suspense>
    </ShellSubpage>
  );
}
