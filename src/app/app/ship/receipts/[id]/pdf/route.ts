import { isUnlockedNow } from "@/features/auth/unlock";
import { receiptPdf } from "@/features/receipts/pdfs";
import { pdfResponse } from "@/lib/pdf/document";

// The sender's receipt as an A4 PDF (combined brief section 7). Read with the person's session: RLS on
// payments and loads decides whether they may have it; a locked app gets nothing (D044).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  if (!(await isUnlockedNow())) return new Response("Locked", { status: 401 });
  const pdf = await receiptPdf(id);
  if (!pdf) return new Response("Not found", { status: 404 });
  return pdfResponse(pdf.bytes, pdf.name);
}
