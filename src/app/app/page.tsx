import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { toAccounts } from "@/features/org/accounts";
import { supabaseServer } from "@/lib/supabase/server";

// After sign-in, /app opens the shell for the person's active account (ux-conventions §2, A-09). Someone
// with no organisation yet starts in the sender shell (the shells check the session themselves).
async function OpenShell(): Promise<null> {
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("my_accounts");
  const active = toAccounts(data ?? []).find((account) => account.active);
  redirect(active?.href ?? "/app/ship");
}

export default function AppPage() {
  return (
    <Suspense>
      <OpenShell />
    </Suspense>
  );
}
