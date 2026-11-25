import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { VerifyTwoStep } from "@/features/auth/two-step-forms";
import { twoStepLocked } from "@/features/auth/two-step-lock";
import { requestHome } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Step({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw, await requestHome());
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth?mode=signin");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (!factors?.totp.some((factor) => factor.status === "verified")) {
    // Staff with no authenticator yet set one up in the console (required).
    const { data: staff } = await supabase.rpc("my_staff_role");
    redirect(staff ? "/admin/setup" : next);
  }
  if (await twoStepLocked(data.claims.sub)) redirect(`/auth/two-step/locked?next=${encodeURIComponent(next)}`);
  return <VerifyTwoStep next={next} />;
}

// Sign-in with two-step on (D044): after the PIN or email code, the authenticator code.
export default function TwoStepPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-card" />}>
      <Step searchParams={searchParams} />
    </Suspense>
  );
}
