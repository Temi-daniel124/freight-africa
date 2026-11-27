import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DriverMessage } from "@/features/owner/messages";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.driverMessages.title };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  return <DriverMessage id={(await params).id} />;
}

// O19e one message from a driver, with the reply.
export default function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="owner" title={messages.driverMessages.title} flush>
      <Suspense fallback={<Skeleton className="m-4 h-80 rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
