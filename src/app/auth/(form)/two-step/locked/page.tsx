import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { realEmail } from "@/features/auth/phone-account";
import { TwoStepLocked } from "@/features/auth/two-step-forms";
import { twoStepLocked } from "@/features/auth/two-step-lock";
import { requestHome } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Locked({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw, await requestHome());
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/auth?mode=signin");
  if (!(await twoStepLocked(claims.sub))) redirect(`/auth/two-step?next=${encodeURIComponent(next)}`);
  const { data: staff } = await supabase.rpc("my_staff_role");
  return <TwoStepLocked email={realEmail(typeof claims.email === "string" ? claims.email : "")} next={next} staff={!!staff} />;
}

// X00j: two-step sign-in is locked after five wrong authenticator codes in a row.
export default function TwoStepLockedPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
      <Locked searchParams={searchParams} />
    </Suspense>
  );
}
