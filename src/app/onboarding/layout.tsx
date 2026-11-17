import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.onboardingTitle, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// DESIGN_SYSTEM.md 14.4: plain page, the logo, one question per screen.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-paper px-4 pt-6 pb-12 sm:pt-10">
      <Logo variant="primary-green" alt={messages.meta.name} className="h-9" priority />
      <main className="mt-8 w-full max-w-xl rounded-card bg-surface p-5 shadow-raised sm:mt-10 sm:p-8">{children}</main>
    </div>
  );
}
