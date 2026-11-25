import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { onboardingSession } from "@/features/onboarding/session";
import { IdentityForm } from "@/features/verification/identity-form";
import { supabaseServer } from "@/lib/supabase/server";
import { verificationProvider, type CheckPurpose } from "@/lib/verification/provider";
import messages from "@/messages/en.json";

const t = messages.onboarding.identity;
const HOMES: Record<CheckPurpose, string> = { sender: "/app/ship", owner: "/app/haul", driver: "/app/drive", agent: "/app/agent" };

function Note({ title, text, home }: { title: string; text: string; home: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-2 text-ink">{title}</h2>
        <p className="text-body text-ink-2">{text}</p>
      </div>
      <Link href={home} className={buttonVariants({ variant: "secondary", className: "w-full" })}>
        {t.sent.home}
      </Link>
    </div>
  );
}

async function Check({ purpose }: { purpose: CheckPurpose }) {
  const { agreed } = await onboardingSession(`/onboarding/identity/${purpose}`);
  if (!agreed) redirect("/onboarding/role");
  const supabase = await supabaseServer();
  const [{ data: isDemo }, { data: latest }] = await Promise.all([
    supabase.rpc("am_i_demo"),
    supabase.from("verification_sessions").select("status, decision_reason").eq("purpose", purpose).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const home = HOMES[purpose];
  if (latest?.status === "approved") return <Note title={t.approved.title} text={t.approved.text} home={home} />;
  if (latest?.status === "needs_review" || latest?.status === "in_progress") return <Note title={t.waiting.title} text={t.waiting.text} home={home} />;
  const provider = verificationProvider(isDemo === true);
  if (!provider || provider.kind !== "demo") return <Note title={t.unavailable.title} text={t.unavailable.text} home={home} />;
  return (
    <div className="flex flex-col gap-5">
      {latest?.status === "declined" ? (
        <p role="status" className="rounded-inner bg-warning-100 px-4 py-3 text-body-sm text-warning">
          <b className="block font-semibold">{t.declined.title}</b>
          {t.declined.text.replace("{reason}", latest.decision_reason ?? "")}
        </p>
      ) : null}
      <IdentityForm purpose={purpose} home={home} />
    </div>
  );
}

async function Page({ params }: { params: Promise<{ purpose: string }> }) {
  const { purpose } = await params;
  if (!(purpose in HOMES)) notFound();
  const p = purpose as CheckPurpose;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={HOMES[p]} className="flex items-center gap-1.5 self-start text-body-sm font-semibold text-green-700">
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
          {t.back}
        </Link>
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.lead[p]}</p>
      </div>
      <Check purpose={p} />
    </div>
  );
}

// The identity check (D041 for senders; T-ON-03, D-ON-02, G-ON-03 for the others), founder mockup 2.3.
export default function IdentityPage({ params }: { params: Promise<{ purpose: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
      <Page params={params} />
    </Suspense>
  );
}
