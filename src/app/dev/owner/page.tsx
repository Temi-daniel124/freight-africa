import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { LoadDetail } from "@/features/owner/load-detail";
import { SAMPLE_LOAD, SAMPLE_OFFER } from "@/features/owner/samples";

export const metadata: Metadata = { title: "Owner screens", robots: { index: false, follow: false } };

// Owner screens with the mockups' sample data (owner-mockups), keyed by mockup id. Preview and development
// only; screens with real data are compared at their real routes (scripts/mockup-pairs/owner.json).

const SCREENS: Record<string, () => ReactNode> = {
  O13: () => <LoadDetail {...SAMPLE_LOAD} />,
  O13b: () => <LoadDetail {...SAMPLE_LOAD} start="accept" />,
  O13c: () => <LoadDetail {...SAMPLE_LOAD} start="done" />,
  O13d: () => <LoadDetail {...SAMPLE_LOAD} start="offer" />,
  O13e: () => <LoadDetail {...SAMPLE_OFFER} />,
  O13f: () => <LoadDetail {...SAMPLE_OFFER} start="offer" />,
  OD03: () => <LoadDetail {...SAMPLE_LOAD} start="accept" />,
};

async function Chosen({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const { screen = "" } = await searchParams;
  const render = SCREENS[screen];
  if (!render) notFound();
  return <>{render()}</>;
}

export default function OwnerScreensPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <main className="min-h-dvh bg-paper">
      <Suspense>
        <Chosen searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
