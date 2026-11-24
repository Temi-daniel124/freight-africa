import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { shells } from "@/features/shell/config";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { getViewer } from "@/features/shell/viewer";
import { TruckDetail } from "@/features/trucks/truck-detail";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.truckDetail.title };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer(shells.owner);
  return <TruckDetail id={id} orgId={viewer.orgId} />;
}

// Truck detail (D045).
export default function TruckPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="owner" title={messages.truckDetail.title}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
