import { notFound } from "next/navigation";
import { Suspense } from "react";
import { payPage, senderGate } from "@/features/checkout/data";
import { PayScreen } from "@/features/checkout/screens";
import { shellMetadata } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.checkout.pay };

async function Body({ params }: { params: Promise<{ load: string }> }) {
  const { load } = await params;
  await senderGate(`/app/pay/${load}`);
  const props = await payPage(load);
  if (!props) notFound();
  return <PayScreen {...props} />;
}

// P10 / D04 Pay: the amount, then Continue to Bachs (D048) or Save as draft instead (D049).
export default function PayPage({ params }: { params: Promise<{ load: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Body params={params} />
    </Suspense>
  );
}
