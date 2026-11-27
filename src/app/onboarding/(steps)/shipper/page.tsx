import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyJoining } from "@/features/onboarding/setup";
import { onboardingSession } from "@/features/onboarding/session";
import { ShipperForm } from "@/features/onboarding/shipper-form";

async function Setup() {
  const { agreed, name, avatar } = await onboardingSession("/onboarding/shipper");
  if (!agreed) redirect("/onboarding/role?role=shipper");
  // Already a sender: nothing to set up here.
  if ((await getMyJoining()).kinds.shipper) redirect("/app/ship");
  return <ShipperForm name={name ?? ""} avatar={avatar} />;
}

// A-04 Set up as a sender (mockup P06b): one screen, then booking.
export default function ShipperSetupPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-6 mt-20 h-96 rounded-card md:mx-0" />}>
      <Setup />
    </Suspense>
  );
}
