import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AGENT_SCREENS } from "@/features/agent/previews";

export const metadata: Metadata = { title: "Agent screens", robots: { index: false, follow: false } };

// Agent screens (agent-mockups) with sample data. Preview and development only: the agent backend is
// Phase 6 and the programme stays switched off in production (settings.agents_enabled = false).

async function Chosen({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const { screen = "home" } = await searchParams;
  if (screen === "statement") redirect("/dev/agent/statement");
  const Screen = AGENT_SCREENS[screen];
  if (!Screen) notFound();
  return <>{await Screen()}</>;
}

export default function AgentScreensPage({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <Suspense>
      <Chosen searchParams={searchParams} />
    </Suspense>
  );
}
