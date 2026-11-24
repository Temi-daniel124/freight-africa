import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { toAccounts } from "@/features/org/accounts";
import { parseJoined, shellFor } from "@/features/onboarding/roles";
import { supabaseServer } from "@/lib/supabase/server";

// After sign-in, /app opens the shell for the person's active account (ux-conventions §2, A-09). Someone
// with no organisation yet opens the shell for what they chose at A-03, and someone who hasn't chosen
// goes to that step (the shells check the session themselves).
async function OpenShell(): Promise<null> {
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("my_accounts");
  const active = toAccounts(data ?? []).find((account) => account.active);
  if (active) redirect(active.href);
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/auth?next=/app");
  const { data: profile } = await supabase.from("profiles").select("joining_as").eq("id", claims.claims.sub).maybeSingle();
  const joined = parseJoined(profile?.joining_as);
  redirect(joined ? shellFor(joined) : "/onboarding/role");
}

export default function AppPage() {
  return (
    <Suspense>
      <OpenShell />
    </Suspense>
  );
}
