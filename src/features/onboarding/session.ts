import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";
import { TERMS_VERSION } from "./roles";

/** The signed-in person and whether they've finished the role step. Sends anyone signed out to sign-in. */
export async function onboardingSession(next: string) {
  // Session checks read the clock (token expiry), so this always renders per request.
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(`/auth?next=${encodeURIComponent(next)}`);
  await requireUnlocked(next);
  const [{ data: agreed }, { data: profile }] = await Promise.all([
    supabase.rpc("has_accepted_terms", { p_version: TERMS_VERSION }),
    supabase.from("profiles").select("full_name, avatar_key").eq("id", claims.sub).maybeSingle(),
  ]);
  return { agreed: agreed === true, name: profile?.full_name ?? null, avatar: profile?.avatar_key ?? null };
}
