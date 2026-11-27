import { notFound } from "next/navigation";
import { Suspense } from "react";
import { demoCheckout, senderGate } from "@/features/checkout/data";
import { DemoCheckout } from "@/features/checkout/screens";
import { shellMetadata } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.checkout.demoTitle };

async function Body({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ back?: string }> }) {
  const [{ ref }, { back }] = await Promise.all([params, searchParams]);
  await senderGate("/app/ship");
  if (!/^demo-co-[0-9a-f-]{36}$/.test(ref)) notFound();
  const row = await demoCheckout(ref);
  if (!row) notFound();
  // Only ever back to our own return screen (no open redirect).
  const safeBack = back && /^\/app\/pay\/return\?(payment|batch)=[0-9a-f-]{36}$/.test(back) ? back : "/app/ship/trips";
  return <DemoCheckout providerRef={ref} amountKobo={row.amountKobo} back={safeBack} />;
}

// D039 + D048: the demo provider's checkout, our own page and plainly a demo, until the Bachs keys arrive.
export default function DemoCheckoutPage(props: { params: Promise<{ ref: string }>; searchParams: Promise<{ back?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Body {...props} />
    </Suspense>
  );
}
