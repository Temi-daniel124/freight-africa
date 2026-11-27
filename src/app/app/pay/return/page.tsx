import { notFound } from "next/navigation";
import { Suspense } from "react";
import { returnPage, senderGate } from "@/features/checkout/data";
import { ReturnScreen } from "@/features/checkout/screens";
import { shellMetadata } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.checkout.confirming };

const UUID = /^[0-9a-f-]{36}$/;

async function Body({ searchParams }: { searchParams: Promise<{ payment?: string; batch?: string }> }) {
  const { payment, batch } = await searchParams;
  const kind = batch ? "batch" : "payment";
  const id = batch ?? payment ?? "";
  await senderGate(`/app/pay/return?${kind}=${id}`);
  if (!UUID.test(id)) notFound();
  const props = await returnPage(kind, id);
  if (!props) notFound();
  return <ReturnScreen {...props} />;
}

// P10b / D04c Confirming your payment, then Finding your truck; P10c when it failed (D048). The
// return itself proves nothing: the screen waits for the provider's confirmation in the database.
export default function ReturnPage({ searchParams }: { searchParams: Promise<{ payment?: string; batch?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}
