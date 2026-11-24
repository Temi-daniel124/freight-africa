import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WELCOME_COOKIE } from "@/features/welcome/cookie";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { requestHome } from "@/lib/ip-key";
import { turnstileSiteKey } from "@/lib/turnstile";
import { signInOptions } from "@/features/auth/options";
import { LoginForm } from "@/features/auth/login-form";
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
  const next = safeNext(first(params.next), await requestHome());

  // Someone already signed in goes straight to where they were heading.
  const { data } = await (await supabaseServer()).auth.getClaims();
  if (data?.claims) redirect(next);

  // D045: the very first visit (no choice made yet, no invite) sees the slides and the Welcome screen.
  if (!params.mode && !params.next && !(await cookies()).get(WELCOME_COOKIE)) redirect("/auth/welcome");

  // D044: "Sign in" is email or phone and the PIN; "Get started" (and invites, which may be new people)
  // is an email code. Sign in is the default: most visits are by people coming back.
  const mode = first(params.mode) === "start" || (first(params.mode) !== "signin" && next.startsWith("/invite/")) ? "start" : "signin";
  if (mode === "signin") return <LoginForm next={next} />;
  return <SignInForm t={messages.auth} options={signInOptions()} next={next} googleFailed={first(params.error) === "google"} turnstileSiteKey={turnstileSiteKey()} />;
}

// A-01 Get started (email code) or Sign in (email or phone, then PIN).
export default function AuthPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}
