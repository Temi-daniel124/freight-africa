"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/** Settings, Driving (D043): an owner or admin switches "I drive my own truck" for themselves; the database checks. */
export async function setIDrive(orgId: string, drives: boolean): Promise<{ ok: boolean }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("set_i_drive", { p_org: orgId, p_drives: drives });
  if (error) {
    console.error("set_i_drive failed", error.code);
    return { ok: false };
  }
  revalidatePath("/app/haul", "layout");
  return { ok: true };
}
