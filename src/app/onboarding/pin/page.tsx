import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PinPad } from "@/features/drivers/pin-pad";
import { onboardingSession } from "@/features/onboarding/session";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Pad({ searchParams }: { searchParams: Params }) {
  await onboardingSession("/onboarding/pin");
  const params = await searchParams;
  const { data: has } = await (await supabaseServer()).rpc("has_app_pin");
  // Someone with a PIN unlocks; someone without (or after signing in again to replace it) chooses one.
  const mode = has === true && params.unlock === "1" ? "unlock" : "set";
  return <PinPad mode={mode} next="/app/drive" />;
}

// D042: choose the app-lock PIN, or enter it to open the app.
export default function PinPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
      <Pad searchParams={searchParams} />
    </Suspense>
  );
}
