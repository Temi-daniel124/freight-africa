import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { trackData, tripForLoad } from "@/features/tracking/data";
import { TrackingView } from "@/features/tracking/tracking-view";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.track.title };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const trip = await tripForLoad((await params).id);
  const data = trip ? await trackData(trip) : null;
  if (!data) notFound();
  return <TrackingView data={data} />;
}

// Trip tracking (reference 04, D045).
export default function TrackTripPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="shipper" title={messages.track.title} flush>
      <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
