import { CircleCheck, Clock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { RoadLine } from "@/components/ui/road-line";
import { Skeleton } from "@/components/ui/skeleton";
import { AboutForm, BankForm } from "@/features/onboarding/owner-forms";
import { onboardingSession } from "@/features/onboarding/session";
import { paymentProvider } from "@/lib/payments/provider";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

const t = messages.onboarding.owner;
type Params = Promise<Record<string, string | string[] | undefined>>;

function Heading({ step, title, lead }: { step?: number; title: string; lead?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {step ? <p className="text-caption font-bold tracking-caps text-ink-3 uppercase">{t.step.replace("{n}", String(step))}</p> : null}
      <h1 className="text-title-1 text-ink">{title}</h1>
      {lead ? <p className="text-body text-ink-2">{lead}</p> : null}
    </div>
  );
}

const when = new Intl.DateTimeFormat("en-NG", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

async function Step({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).step;
  const step = Array.isArray(raw) ? raw[0] : raw;
  const { agreed, name } = await onboardingSession("/onboarding/owner");
  if (!agreed) redirect("/onboarding/role?role=owner");
  const supabase = await supabaseServer();
  const { data: rows } = await supabase.rpc("my_accounts");
  const owned = (rows ?? []).find((row) => row.kind === "transporter" && row.role === "owner") ?? null;

  if (step === "about") {
    const [{ data: cities }, { data: corridors }, { data: org }] = await Promise.all([
      supabase.from("cities").select("id, name").order("name"),
      supabase.from("corridors").select("id, name").eq("active", true).order("name"),
      owned ? supabase.from("organizations").select("home_city_id, corridor_ids").eq("id", owned.org_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return (
      <>
        <RoadLine progress={25} />
        <Heading step={1} title={t.about.title} />
        <AboutForm
          cities={cities ?? []}
          corridors={corridors ?? []}
          defaults={{ name: name ?? "", companyName: "", drives: owned?.is_driver ?? false, base: org?.home_city_id ?? "", routes: org?.corridor_ids ?? [], hasOrg: !!owned }}
        />
      </>
    );
  }

  if (step === "bank") {
    if (!owned) redirect("/onboarding/owner?step=about");
    const [{ data: isDemo }, { data: accounts }] = await Promise.all([
      supabase.rpc("am_i_demo"),
      supabase.from("bank_accounts").select("bank_name, account_last4, usable_from, status").eq("org_id", owned.org_id).neq("status", "disabled").limit(1),
    ]);
    const current = accounts?.[0];
    const provider = paymentProvider(isDemo === true);
    return (
      <>
        <RoadLine progress={60} />
        <Heading step={3} title={t.bank.title} lead={t.bank.lead} />
        {current ? (
          <div className="flex flex-col gap-4">
            <p className="flex items-start gap-2.5 rounded-inner bg-paper px-4 py-3 text-body text-ink">
              {current.status === "active" ? <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={1.75} /> : <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" strokeWidth={1.75} />}
              <span>
                {t.bank.current.replace("{bank}", current.bank_name).replace("{last4}", current.account_last4)}{" "}
                {current.status === "pending_hold" ? t.bank.saved.replace("{when}", when.format(new Date(current.usable_from))) : null}
              </span>
            </p>
            <Link href="/app/haul" className={buttonVariants({ className: "w-full" })}>
              {messages.onboarding.identity.sent.home}
            </Link>
          </div>
        ) : provider ? (
          <BankForm banks={await provider.banks()} />
        ) : (
          <p className="rounded-inner bg-paper px-4 py-3 text-body text-ink-2">{t.bank.unavailable}</p>
        )}
      </>
    );
  }

  // T-ON-01 What you'll need.
  return (
    <>
      <RoadLine progress={10} />
      <Heading title={t.start.title} />
      <ul className="flex flex-col">
        {t.start.items.map((item) => (
          <li key={item.text} className="flex items-baseline justify-between gap-4 border-t border-line py-3 first:border-t-0">
            <span className="text-body text-ink">{item.text}</span>
            <span className="shrink-0 text-label text-ink-3">{item.time}</span>
          </li>
        ))}
      </ul>
      <p className="text-body-sm text-ink-2">{t.start.parts}</p>
      <p className="rounded-inner bg-green-50 px-4 py-3 text-body-sm text-green-800">{t.start.paid}</p>
      <Link href="/onboarding/owner?step=about" className={buttonVariants({ className: "w-full" })}>
        {t.start.start}
      </Link>
    </>
  );
}

// The transporter setup (ux-owner.md T-ON-01 to T-ON-04; owner-drivers per ux-owner-driver.md).
export default function OwnerSetupPage({ searchParams }: { searchParams: Params }) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Step searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
