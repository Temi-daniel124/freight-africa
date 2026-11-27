import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WELCOME_COOKIE } from "@/features/welcome/cookie";
import { WelcomeFlow } from "@/features/welcome/welcome-flow";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.welcome.title, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// W-00 and W-01 (D045, mockups P01–P02): the first visit to app.freight-africa.com shows the slides; after
// that (Back from sign-in, or ?slides=0) the Welcome screen alone.
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const seen = Boolean((await cookies()).get(WELCOME_COOKIE)) || (await searchParams).slides === "0";
  return <WelcomeFlow seen={seen} />;
}
