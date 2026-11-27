import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SenderTripPage } from "@/features/booking/trip-page";
import { findingProps } from "@/features/checkout/data";
import { FindingView } from "@/features/checkout/finding";
import { senderTripView } from "@/features/trips/data";
import { SenderTrip } from "@/features/trips/sender-trip";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.trips.details };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ details?: string }> };

async function Chooser({ params, searchParams }: Props) {
  const [{ id }, { details }] = await Promise.all([params, searchParams]);
  // P11 / D08: a paid booking still waiting for a truck opens on Finding your truck ("View trip" shows the rest).
  // P14b / P14c / D09: a booking with a truck. Both draw their own phone header (full screen, no tabs).
  const finding = details ? null : await findingProps(id);
  const trip = details || finding ? null : await senderTripView(id);
  if (finding || trip) {
    return (
      <ShellSubpage role="shipper" title={messages.trips.details} flush>
        {finding ? <FindingView {...finding} /> : <SenderTrip v={trip!} />}
      </ShellSubpage>
    );
  }
  return (
    <ShellSubpage role="shipper" title={messages.trips.details}>
      <SenderTripPage id={id} />
    </ShellSubpage>
  );
}

// S-04 to S-07: one of the sender's trips.
export default function TripPage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-96 rounded-card lg:m-8" />}>
      <Chooser {...props} />
    </Suspense>
  );
}
