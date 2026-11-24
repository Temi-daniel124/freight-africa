import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { shells } from "@/features/shell/config";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { getViewer } from "@/features/shell/viewer";
import { TrackPage } from "@/features/tracking/track-page";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.track.title };

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Body({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).ref;
  const ref = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 20) || null;
  return <TrackPage viewer={getViewer(shells.shipper)} refQuery={ref} />;
}

// Track a trip (D045).
export default function Track({ searchParams }: { searchParams: Params }) {
  return (
    <ShellSubpage role="shipper" title={messages.track.title}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </ShellSubpage>
  );
}
