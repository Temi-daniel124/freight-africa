import { avatarSrc } from "@/features/settings/avatars";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { isInternalEmail } from "@/features/auth/phone-account";
import { PinUnlock } from "@/features/auth/pin-screens";
import { requestHome } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Pad({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).next;
  const next = safeNext(Array.isArray(raw) ? raw[0] : raw, await requestHome());
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/auth?mode=signin&next=${encodeURIComponent(next)}`);
  const { data: has } = await supabase.rpc("has_app_pin");
  if (has === false) redirect(`/auth/pin/new?next=${encodeURIComponent(next)}`);
  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_key").eq("id", data.claims.sub).maybeSingle();
  const name = profile?.full_name?.trim();
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  const src = avatarSrc(profile?.avatar_key);
  return <PinUnlock next={next} phone={isInternalEmail(email)} name={name} email={email} avatar={name ? <Avatar name={name} src={src} size={76} /> : undefined} />;
}

// A-13 Enter your PIN: the app locked on this device (D044).
export default function UnlockPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none md:h-140 md:w-100 md:rounded-card" />}>
      <Pad searchParams={searchParams} />
    </Suspense>
  );
}
