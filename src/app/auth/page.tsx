import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { signInOptions } from "@/features/auth/options";
import { SignInForm } from "@/features/auth/sign-in-form";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata: Metadata = {
  title: messages.meta.signInTitle,
  description: messages.meta.signInDescription,
  alternates: { canonical: "/auth" },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label={messages.waitlist.loading}>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full rounded-button" />
    </div>
  );
}

async function SignIn({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const next = safeNext(first(params.next));

  // Someone already signed in goes straight to where they were heading.
  const { data } = await (await supabaseServer()).auth.getClaims();
  if (data?.claims) redirect(next);

  return <SignInForm t={messages.auth} options={signInOptions()} next={next} googleFailed={first(params.error) === "google"} />;
}

// A-01 Sign in or sign up.
export default function AuthPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}
