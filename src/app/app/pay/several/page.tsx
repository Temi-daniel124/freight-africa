import { Suspense } from "react";
import { senderGate, severalDrafts } from "@/features/checkout/data";
import { PaySeveral } from "@/features/checkout/screens";
import { shellMetadata } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.checkout.several };

async function Body() {
  const viewer = await senderGate("/app/pay/several");
  const drafts = viewer.orgId ? await severalDrafts(viewer.orgId) : [];
  return <PaySeveral drafts={drafts} />;
}

// P15c Pay for several: one checkout on Bachs, each trip booked and held on its own (D049).
export default function PaySeveralPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Body />
    </Suspense>
  );
}
