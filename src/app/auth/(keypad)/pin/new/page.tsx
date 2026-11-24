import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { PinSet } from "@/features/auth/pin-screens";
import { requestHome } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Pad({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw, await requestHome());
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/auth?next=${encodeURIComponent(next)}`);
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.claims.sub).maybeSingle();
  const name = profile?.full_name?.trim();
  return <PinSet next={next} avatar={name ? <Avatar name={name} size={64} /> : undefined} />;
}

// A-11 Set your PIN (D044): after the first email code, a forgotten PIN, an invite or a PIN link.
export default function NewPinPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none md:h-140 md:w-100 md:rounded-card" />}>
      <Pad searchParams={searchParams} />
    </Suspense>
  );
}
