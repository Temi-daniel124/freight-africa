import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GpsTest } from "@/features/driver/gps-test";
import { InstallFlow, type InstallView } from "@/features/driver/install-flow";

export const metadata: Metadata = { title: "Driver screens", robots: { index: false, follow: false } };

// Driver screens with the mockups' sample data (driver-mockups DV05–DV06). Preview and development only.

const VIEWS: InstallView[] = ["start", "waiting", "failed", "ios", "done"];

async function Chosen({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const { screen = "start" } = await searchParams;
  if (screen === "gps") return <GpsTest next="/dev/driver?screen=gps" name="Aisha Bello" phone="+2348035550177" />;
  if (!VIEWS.includes(screen as InstallView)) notFound();
  return <InstallFlow next="/dev/driver?screen=gps" preview={screen as InstallView} />;
}

export default function DriverScreensPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-paper px-5 pt-8 pb-10">
      <Suspense>
        <Chosen searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
