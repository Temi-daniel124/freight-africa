import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { RoadLine } from "@/components/ui/road-line";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { agentsEnabled, shellFor, type JoiningAs } from "@/features/onboarding/roles";
import { onboardingSession } from "@/features/onboarding/session";
import messages from "@/messages/en.json";

const t = messages.onboarding.next;

async function Next({ role }: { role: JoiningAs }) {
  if (role === "agent" && !agentsEnabled()) redirect("/onboarding/role");
  const { agreed, name } = await onboardingSession(`/onboarding/${role}`);
  // The agreements come first.
  if (!agreed) redirect(`/onboarding/role?role=${role}`);
  const first = name?.split(/\s+/)[0];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{first ? t.title.replace("{name}", first) : t.anon}</h1>
        <p className="text-body text-ink-2">{t[role]}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href={shellFor(role)} className={buttonVariants({ className: "w-full" })}>
          {t.home}
        </Link>
        <Link href={`/onboarding/role?role=${role}`} className={buttonVariants({ variant: "secondary", className: "w-full" })}>
          {t.change}
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="tertiary" className="w-full">
            {t.signOut}
          </Button>
        </form>
      </div>
    </div>
  );
}

// Where each role's setup (A-04, T-ON-01, G-ON-01) starts until Phase 2 replaces these pages with the real
// setup screens; until then it leads back into the app, never to a dead end.
export function NextStep({ role }: { role: JoiningAs }) {
  return (
    <div className="flex flex-col gap-6">
      <RoadLine progress={20} />
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <Next role={role} />
      </Suspense>
    </div>
  );
}
