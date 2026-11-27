import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DriverMessagesList } from "@/features/owner/messages";
import { shells } from "@/features/shell/config";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { getViewer } from "@/features/shell/viewer";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.driverMessages.title };

async function Body() {
  const { orgId } = await getViewer(shells.owner);
  if (!orgId) notFound();
  return <DriverMessagesList orgId={orgId} />;
}

// O19d / OD11b Messages from drivers (owner and Admins; RLS: manage_drivers).
export default function MessagesPage() {
  return (
    <ShellSubpage role="owner" title={messages.driverMessages.title}>
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-card" />}>
        <Body />
      </Suspense>
    </ShellSubpage>
  );
}
