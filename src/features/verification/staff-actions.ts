"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export type DecideState = { status: "idle" | "done" | "needReason" | "error"; attempt: number };

/** Verification staff approve or decline an identity check (the database checks role, aal2 and reason). */
export async function decideIdentity(previous: DecideState, formData: FormData): Promise<DecideState> {
  const attempt = previous.attempt + 1;
  const session = String(formData.get("session") ?? "");
  const approve = formData.get("decision") === "approve";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!approve && !reason) return { status: "needReason", attempt };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("decide_identity_check", { p_session: session, p_approve: approve, p_reason: reason || undefined });
  if (error) {
    console.error("decide_identity_check failed", error.code);
    return { status: "error", attempt };
  }
  revalidatePath("/admin/verification");
  return { status: "done", attempt };
}
