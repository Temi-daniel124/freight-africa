"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

export type CancelQuote = { allowed: boolean; refundKobo: number; ownerFeeKobo: number; serviceKobo: number; status: string };

/** P14e: what cancelling would give back, from the same rules as cancel_load (read only). */
export async function cancelQuote(loadId: string): Promise<CancelQuote | null> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const [{ data, error }, { data: load }] = await Promise.all([
    supabase.rpc("cancel_quote", { p_load: loadId }),
    supabase.from("loads").select("status").eq("id", loadId).maybeSingle(),
  ]);
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    allowed: row.allowed === true,
    refundKobo: Number(row.refund_kobo),
    ownerFeeKobo: Number(row.owner_fee_kobo),
    serviceKobo: Number(row.service_kobo),
    status: load?.status ?? "",
  };
}
