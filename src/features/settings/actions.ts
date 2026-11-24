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

/** Settings and setup, "Choose your picture" (D045): only the face's key is saved. */
export async function setAvatar(key: string | null): Promise<{ ok: boolean }> {
  await assertUnlocked();
  if (key !== null && !/^face-(0[1-9]|1[0-2])$/.test(key)) return { ok: false };
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false };
  const { error } = await supabase.from("profiles").update({ avatar_key: key }).eq("id", data.claims.sub);
  if (error) {
    console.error("saving avatar_key failed", error.code);
    return { ok: false };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}
