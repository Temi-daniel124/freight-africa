import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GpsTest } from "@/features/driver/gps-test";
import { onboardingSession } from "@/features/onboarding/session";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.driverGps.title, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

async function Test() {
  await onboardingSession("/onboarding/gps");
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: profile } = await supabase.from("profiles").select("emergency_contact_name, emergency_contact_phone").eq("id", claims?.claims?.sub ?? "").maybeSingle();
  return <GpsTest next="/app/drive" name={profile?.emergency_contact_name ?? ""} phone={profile?.emergency_contact_phone ?? ""} />;
}

// DV06 Test your GPS, after the app is installed.
export default function GpsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-paper px-5 pt-8 pb-10">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Test />
      </Suspense>
    </main>
  );
}
