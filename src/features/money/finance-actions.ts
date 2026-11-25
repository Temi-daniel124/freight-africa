"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

/** Finance second approval (two people above payout_two_person_kobo); the database checks role, aal2 and the second person. */
export async function approveMoneyOut(kind: "payout" | "refund", id: string): Promise<boolean> {
  await assertUnlocked();
  const { error } = await (await supabaseServer()).rpc("approve_money_out", { p_kind: kind, p_id: id });
  revalidatePath("/admin", "layout");
  return !error;
}
