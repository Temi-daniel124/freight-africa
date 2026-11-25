import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { TrackerForm } from "@/features/trucks/tracker-form";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.tracker.title };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await (await supabaseServer()).from("trucks").select("id, plate_number, tracker_device_id").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="mx-auto w-full max-w-160 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-8">
      <TrackerForm truckId={data.id} current={data.tracker_device_id} server={`${await requestOrigin()}/api/trackers/osmand`} />
    </div>
  );
}

// T-18 Connect a GPS tracker.
export default function TrackerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="owner" title={messages.tracker.title}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
