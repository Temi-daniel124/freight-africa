import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { AddTwoStep } from "@/features/auth/two-step-forms";
import { requestHome } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Step({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw, await requestHome());
  const { data } = await (await supabaseServer()).auth.getClaims();
  if (!data?.claims) redirect("/auth?mode=signin");
  return <AddTwoStep next={next} />;
}

// A-12 Add two-step sign-in (optional, D044).
export default function AddTwoStepPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-card" />}>
      <Step searchParams={searchParams} />
    </Suspense>
  );
}
