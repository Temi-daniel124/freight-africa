import { Suspense } from "react";
import { RoadLine } from "@/components/ui/road-line";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleForm } from "@/features/onboarding/role-form";
import { agentsEnabled, JOINING_AS, parseJoiningAs } from "@/features/onboarding/roles";
import { onboardingSession } from "@/features/onboarding/session";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

const t = messages.onboarding;
type Params = Promise<Record<string, string | string[] | undefined>>;

async function Role({ searchParams }: { searchParams: Params }) {
  const { agreed } = await onboardingSession("/onboarding/role");
  const raw = (await searchParams).role;
  const choices = JOINING_AS.filter((choice) => choice !== "agent" || agentsEnabled());
  const preset = parseJoiningAs(Array.isArray(raw) ? raw[0] : raw);
  return (
    <RoleForm
      t={t}
      choices={choices}
      preset={preset && choices.includes(preset) ? preset : null}
      agreed={agreed}
      termsHref={siteHref("/legal/terms")}
      privacyHref={siteHref("/legal/privacy")}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={messages.waitlist.loading}>
      <Skeleton className="h-24 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
      <Skeleton className="mt-5 h-14 w-full rounded-button" />
    </div>
  );
}

// A-03 What brings you here? (ux-public-and-auth.md)
export default function RolePage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="flex flex-col gap-6">
      <RoadLine progress={8} />
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.lead}</p>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <Role searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
