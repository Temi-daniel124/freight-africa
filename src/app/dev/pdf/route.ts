import { notFound } from "next/navigation";
import { renderAdvice, renderPayoutStatement } from "@/features/receipts/owner-pdfs";
import { renderReceipt, renderStatement } from "@/features/receipts/pdfs";
import { SAMPLE_ADVICE, SAMPLE_PAYOUT_STATEMENT, SAMPLE_RECEIPT, SAMPLE_STATEMENT } from "@/features/receipts/samples";
import { pdfResponse } from "@/lib/pdf/document";

// Every PDF with the mockups' sample data: ?doc=receipt|statement|advice|payout-statement (sender DOC-*,
// owner ODOC-*). Preview and development only.
export async function GET(request: Request) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const doc = new URL(request.url).searchParams.get("doc");
  const r =
    doc === "receipt"
      ? await renderReceipt(SAMPLE_RECEIPT)
      : doc === "statement"
        ? await renderStatement(SAMPLE_STATEMENT)
        : doc === "advice"
          ? await renderAdvice(SAMPLE_ADVICE)
          : doc === "payout-statement"
            ? await renderPayoutStatement(SAMPLE_PAYOUT_STATEMENT)
            : null;
  if (!r) notFound();
  return pdfResponse(r.bytes, r.name);
}
