import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { receiptModel } from "@/features/receipts/pdfs";
import { ReceiptView } from "@/features/receipts/receipt-view";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.receipt.title };

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // RLS decides who may read this payment (receiptModel reads it as the signed-in person).
  const model = await receiptModel(id);
  if (!model) notFound();
  return <ReceiptView m={model} pdfHref={`/app/ship/receipts/${id}/pdf`} backHref="/app/ship/payments" />;
}

// P15b / D07b receipt; the PDF (DOC-Receipt) is drawn from the same model.
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="shipper" title={messages.receipt.title}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Receipt params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
