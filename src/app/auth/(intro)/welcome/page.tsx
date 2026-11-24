import type { Metadata } from "next";
import { WelcomeFlow } from "@/features/welcome/welcome-flow";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.welcome.title, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// W-00 and W-01 (D045): the first visit to app.freight-africa.com only (the website stays waitlist-only).
export default function WelcomePage() {
  return <WelcomeFlow />;
}
