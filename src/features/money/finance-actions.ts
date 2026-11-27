"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

/** Finance second approval (two people above payout_two_person_kobo), with a reason for the audit log; the database checks role, aal2 and the second person. */
export async function approveMoneyOut(kind: "payout" | "refund", id: string, reason: string): Promise<boolean> {
  await assertUnlocked();
  const note = reason.trim();
  if (note.length < 5 || note.length > 500) return false;
  const { error } = await (await supabaseServer()).rpc("approve_money_out", { p_kind: kind, p_id: id, p_note: note });
  revalidatePath("/admin", "layout");
  return !error;
}
