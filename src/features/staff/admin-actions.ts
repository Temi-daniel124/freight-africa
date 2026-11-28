"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { sendStaffInviteEmail } from "@/features/staff/invite-email";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

// X21 settings, X17 approvals and X24 staff invites. The database checks the role (super admin),
// two-step sign-in, the second person for money settings, and writes the audit log.

type Result = { status: "ok" | "waiting" | "reason" | "value" | "fresh" | "notSent" | "error" };
const reasonOk = (r: string) => r.trim().length >= 5 && r.trim().length <= 500;
// One address, no lists or angle brackets (review).
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export async function changeSetting(key: string, raw: string, reason: string): Promise<Result> {
  await assertUnlocked();
  if (!reasonOk(reason)) return { status: "reason" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "value" };
  }
  const { data, error } = await (await supabaseServer()).rpc("change_setting_reasoned", { p_key: key, p_value: value as never, p_note: reason.trim() });
  if (error) return { status: error.code === "22023" ? "value" : "error" };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/fees");
  return { status: data ? "waiting" : "ok" };
}

export async function decideApproval(id: string, approve: boolean, reason: string): Promise<Result> {
  await assertUnlocked();
  if (!reasonOk(reason)) return { status: "reason" };
  const { error } = await (await supabaseServer()).rpc("decide_approval", { p_approval: id, p_approve: approve, p_note: reason.trim() });
  // 28000: a sole super admin approving their own change must enter their authenticator code again.
  if (error) return { status: error.code === "28000" ? "fresh" : "error" };
  revalidatePath("/admin/approvals");
  return { status: "ok" };
}

export async function inviteStaff(email: string, role: string): Promise<Result> {
  await assertUnlocked();
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) return { status: "value" };
  const { data: token, error } = await (await supabaseServer()).rpc("invite_staff", { p_email: clean, p_role: role as never });
  if (error || typeof token !== "string") return { status: error?.code === "28000" ? "fresh" : error?.code === "22023" ? "value" : "error" };
  const sent = await sendStaffInviteEmail(clean, `${await requestOrigin()}/admin/invite/${token}`);
  revalidatePath("/admin/staff");
  return { status: sent ? "ok" : "notSent" };
}

export async function resolveReconciliation(id: string, note: string): Promise<Result> {
  await assertUnlocked();
  if (!reasonOk(note)) return { status: "reason" };
  const { error } = await (await supabaseServer()).rpc("resolve_reconciliation", { p_id: id, p_note: note.trim() });
  if (error) return { status: "error" };
  revalidatePath("/admin/reconciliation");
  return { status: "ok" };
}
