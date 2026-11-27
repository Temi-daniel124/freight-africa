import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LicenceForm } from "@/features/drivers/licence-form";
import { onboardingSession } from "@/features/onboarding/session";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

const t = messages.drivers.licence;

async function Form() {
  await onboardingSession("/onboarding/licence");
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: driver } = await supabase.from("drivers").select("user_id").eq("user_id", claims?.claims?.sub ?? "").maybeSingle();
  // Only drivers and owner-drivers have a licence to add.
  if (!driver) redirect("/app");
  const { data: rows } = await supabase.rpc("my_accounts");
  const home = (rows ?? []).some((row) => row.kind === "transporter" && row.role === "driver") ? "/app/drive" : "/app/haul";
  return <LicenceForm home={home} />;
}

// D-ON-03 Driver's licence (ux-driver.md), also T-ON-06 for owner-drivers.
export default function LicencePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.lead}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Form />
      </Suspense>
    </div>
  );
}
