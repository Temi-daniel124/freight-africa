import { isUnlockedNow } from "@/features/auth/unlock";
import { toAccounts } from "@/features/org/accounts";
import { payoutStatementCsv } from "@/features/receipts/owner-pdfs";
import { supabaseServer } from "@/lib/supabase/server";

// The owner's monthly payout statement as a spreadsheet (CSV) for the active truck business (see_money only).
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
  const csv = await payoutStatementCsv(active.orgId, month);
  if (!csv) return new Response("Not found", { status: 404 });
  return new Response(csv.text, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${csv.name}"`, "Cache-Control": "private, no-store" } });
}
