"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/** Verification staff approve or reject a truck or one of its papers (the database checks role, aal2, reason). */
export async function decideFleet(previous: DecideState, formData: FormData): Promise<DecideState> {
  await assertUnlocked();
  const attempt = previous.attempt + 1;
  const id = String(formData.get("session") ?? "");
  const raw = formData.get("kind");
  const kind = raw === "truck" ? "truck" : raw === "bank" ? "bank_account" : "document";
  const approve = formData.get("decision") === "approve";
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!approve && !reason) return { status: "needReason", attempt };
  const supabase = await supabaseServer();
  const { error } =
    kind === "truck"
      ? await supabase.rpc("decide_truck", { p_truck: id, p_approve: approve, p_note: reason || undefined })
      : kind === "bank_account"
        ? await supabase.rpc("decide_bank_account", { p_account: id, p_approve: approve, p_note: reason || undefined })
        : await supabase.rpc("decide_document", { p_document: id, p_approve: approve, p_note: reason || undefined });
  if (error) {
    console.error(`decide_${kind} failed`, error.code);
    return { status: "error", attempt };
  }
  revalidatePath("/admin/verification");
  return { status: "done", attempt };
}

export type DecideState = { status: "idle" | "done" | "needReason" | "error"; attempt: number };

/** Verification staff approve or decline an identity check (the database checks role, aal2 and reason). */
export async function decideIdentity(previous: DecideState, formData: FormData): Promise<DecideState> {
  await assertUnlocked();
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
