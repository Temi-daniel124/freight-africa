import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { formatNigerianPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.staffTitle, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

const t = messages.auth.staff;

async function Staff() {
  // The server checks the session itself; the proxy only refreshes it.
  const { data } = await (await supabaseServer()).auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/auth?next=/admin");

  const who = typeof claims.email === "string" && claims.email ? claims.email : typeof claims.phone === "string" && claims.phone ? `+234 ${formatNigerianPhone(claims.phone)}` : "";
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.text}</p>
        {who ? <p className="text-body break-words text-ink">{t.signedInAs.replace("{who}", who)}</p> : null}
      </div>
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          {t.signOut}
        </Button>
      </form>
    </>
  );
}

// The staff console's address (D033). Until the staff slice builds the console and two-step sign-in, a
// signed-in visitor sees this holding page and nothing else: there is no staff data behind it yet.
export default function AdminPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-paper px-4 py-8 lg:justify-center">
      <Logo variant="stacked-green" className="h-24" priority />
      <div className="flex w-full max-w-md flex-col gap-6 rounded-card bg-surface p-5 shadow-raised lg:p-8">
        <Suspense
          fallback={
            <div className="flex flex-col gap-6" role="status" aria-label={messages.waitlist.loading}>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-14 w-full rounded-button" />
            </div>
          }
        >
          <Staff />
        </Suspense>
      </div>
    </main>
  );
}
