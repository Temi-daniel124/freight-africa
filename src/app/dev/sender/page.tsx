import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { SenderMoreView } from "@/features/account/account";

export const metadata: Metadata = { title: "Sender screens", robots: { index: false, follow: false } };

// Sender screens whose state the demo account can't show, with the mockups' sample data (sender-mockups).
// Preview and development only.

const SCREENS: Record<string, () => ReactNode> = {
  // P16a: Switch account, for someone in two businesses.
  P16a: () => (
    <SenderMoreView
      person={{ name: "Adaeze Okafor", avatar: "face-02", contact: "adaeze@okaforfoods.ng" }}
      accounts={[
        { orgId: "00000000-0000-4000-8000-000000000001", name: "Okafor Foods Ltd", label: "Sender · Owner", initials: "OF", active: true },
        { orgId: "00000000-0000-4000-8000-000000000002", name: "Okafor Haulage", label: "Truck owner · 2 trucks", initials: "OH", active: false },
      ]}
      people={4}
      twoStep={false}
      switchOpen
    />
  ),
};

async function Chosen({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const { screen = "" } = await searchParams;
  const render = SCREENS[screen];
  if (!render) notFound();
  return <>{render()}</>;
}

export default function SenderScreensPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <main className="mx-auto min-h-dvh w-full max-w-316 bg-paper px-4 pt-4 pb-10 lg:px-8 lg:pt-8">
      <Suspense>
        <Chosen searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
