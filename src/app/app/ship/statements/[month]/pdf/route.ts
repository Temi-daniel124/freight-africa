import { isUnlockedNow } from "@/features/auth/unlock";
import { toAccounts } from "@/features/org/accounts";
import { statementPdf } from "@/features/receipts/pdfs";
import { pdfResponse } from "@/lib/pdf/document";
import { supabaseServer } from "@/lib/supabase/server";

// The month's statement for the active sender business, as an A4 PDF (combined brief section 7).
// Only people who may see the business's money get it (see_money), and RLS still applies to every row.
export async function GET(_request: Request, { params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new Response("Not found", { status: 404 });
  if (!(await isUnlockedNow())) return new Response("Locked", { status: 401 });
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("my_accounts");
  const active = toAccounts(data ?? []).find((a) => a.active);
  if (!active) return new Response("Not found", { status: 404 });
  const { data: perms } = await supabase.rpc("org_permissions", { p_org: active.orgId });
  if (!((perms ?? []) as string[]).includes("see_money")) return new Response("Not allowed", { status: 403 });
  const pdf = await statementPdf(active.orgId, month);
  if (!pdf) return new Response("Not found", { status: 404 });
  return pdfResponse(pdf.bytes, pdf.name);
}
