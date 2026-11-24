"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { readLockLinkToken } from "./lock-link";

export type LockState = { status: "idle" | "done" | "invalid" | "error" };

/** "Not you? Lock your account" (D044): the PIN goes and every device is signed out. */
export async function lockMyAccount(_previous: LockState, formData: FormData): Promise<LockState> {
  const userId = readLockLinkToken(String(formData.get("t") ?? ""));
  if (!userId) return { status: "invalid" };
  const { error } = await supabaseAdmin().rpc("lock_account", { p_user: userId });
  if (error) {
    console.error("lock_account failed", error.code);
    return { status: "error" };
  }
  // This browser too, if it was signed in.
  await (await supabaseServer()).auth.signOut({ scope: "local" });
  return { status: "done" };
}
