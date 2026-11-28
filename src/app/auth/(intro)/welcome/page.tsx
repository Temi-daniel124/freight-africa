import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { WELCOME_COOKIE } from "@/features/welcome/cookie";
import { WelcomeFlow } from "@/features/welcome/welcome-flow";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.welcome.title, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Flow({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  // ?slide=1 or 2 opens on that slide (mockups P01b, P01c), so each slide can be linked and compared.
  const start = params.slide === "1" ? 1 : params.slide === "2" ? 2 : 0;
  const seen = !start && (Boolean((await cookies()).get(WELCOME_COOKIE)) || params.slides === "0");
  return <WelcomeFlow seen={seen} start={start} />;
}

// W-00 and W-01 (D045, mockups P01–P02): the first visit to app.freight-africa.com shows the slides; after
// that (Back from sign-in, or ?slides=0) the Welcome screen alone.
export default function WelcomePage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Flow searchParams={searchParams} />
    </Suspense>
  );
}
