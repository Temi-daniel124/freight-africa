import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleForm } from "@/features/onboarding/role-form";
import { JOINING_AS, parseJoiningAs } from "@/features/onboarding/roles";
import { onboardingSession } from "@/features/onboarding/session";
import { siteHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

const t = messages.onboarding;
type Params = Promise<Record<string, string | string[] | undefined>>;

async function Role({ searchParams }: { searchParams: Params }) {
  const { agreed } = await onboardingSession("/onboarding/role");
  const raw = (await searchParams).role;
  const choices = [...JOINING_AS];
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
    <div className="flex flex-col gap-3 px-6 pt-20 md:px-0" role="status" aria-label={messages.waitlist.loading}>
      <Skeleton className="h-9 w-4/5" />
      <Skeleton className="mt-6 h-33 w-full rounded-card" />
      <Skeleton className="h-33 w-full rounded-card" />
    </div>
  );
}

// A-03 What brings you here? (mockup P06): one choice, the agreements, one button.
export default function RolePage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Role searchParams={searchParams} />
    </Suspense>
  );
}
