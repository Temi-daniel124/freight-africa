import type { Metadata } from "next";
import type { ReactNode } from "react";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.onboardingTitle, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// Mockups P06 and P06b: the paper page, a header, the question, and the button docked at the bottom on
// phones. From 768 px the same column, 480 px wide, centred.
export default function StepsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <main className="mx-auto flex min-h-dvh w-full flex-col md:max-w-120 md:py-10">{children}</main>
    </div>
  );
}
