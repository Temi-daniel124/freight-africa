import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InstallFlow } from "@/features/driver/install-flow";
import { onboardingSession } from "@/features/onboarding/session";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.driverInstall.start.title, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

async function Flow() {
  await onboardingSession("/onboarding/install");
  return <InstallFlow next="/onboarding/gps" />;
}

// DV05–DV05e install the app, with real install detection (D052).
export default function InstallPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-paper px-5 pt-8 pb-10">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Flow />
      </Suspense>
    </main>
  );
}
