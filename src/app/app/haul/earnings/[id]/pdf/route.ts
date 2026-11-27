import { isUnlockedNow } from "@/features/auth/unlock";
import { advicePdf } from "@/features/receipts/owner-pdfs";
import { pdfResponse } from "@/lib/pdf/document";

// O17b "Download payout advice": one paid payout as an A4 PDF. RLS on payouts (see_money) decides.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  if (!(await isUnlockedNow())) return new Response("Locked", { status: 401 });
  const pdf = await advicePdf(id);
  if (!pdf) return new Response("Not found", { status: 404 });
  return pdfResponse(pdf.bytes, pdf.name);
}
