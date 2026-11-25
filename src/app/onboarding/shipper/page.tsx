import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RoadLine } from "@/components/ui/road-line";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyJoining } from "@/features/onboarding/setup";
import { onboardingSession } from "@/features/onboarding/session";
import { AvatarPicker } from "@/features/settings/avatar-picker";
import { ShipperForm } from "@/features/onboarding/shipper-form";
import messages from "@/messages/en.json";

const t = messages.onboarding.shipper;

async function Setup() {
  const { agreed, name } = await onboardingSession("/onboarding/shipper");
  if (!agreed) redirect("/onboarding/role?role=shipper");
  // Already a sender: nothing to set up here.
  if ((await getMyJoining()).kinds.shipper) redirect("/app/ship");
  return (
    <>
      <ShipperForm name={name ?? ""} />
      {/* D045: Choose your picture (optional, also in Settings). */}
      <section className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="text-title-3 text-ink">{messages.settings.picture.title}</h2>
        <AvatarPicker name={name ?? ""} current={null} />
      </section>
    </>
  );
}

// A-04 Set up as a shipper (ux-shipper.md): one screen, then booking.
export default function ShipperSetupPage() {
  return (
    <div className="flex flex-col gap-6">
      <RoadLine progress={60} />
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.lead}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-card" />}>
        <Setup />
      </Suspense>
    </div>
  );
}
