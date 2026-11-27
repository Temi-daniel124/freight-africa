"use server";

import { revalidatePath } from "next/cache";
import { assertUnlocked } from "@/features/auth/unlock";
import { sendStaffInviteEmail } from "@/features/staff/invite-email";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

// X21 settings, X17 approvals and X24 staff invites. The database checks the role (super admin),
// two-step sign-in, the second person for money settings, and writes the audit log.

type Result = { status: "ok" | "waiting" | "reason" | "value" | "error" };

export async function changeSetting(key: string, raw: string, reason: string): Promise<Result> {
  await assertUnlocked();
  if (reason.trim().length < 5) return { status: "reason" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "value" };
  }
  const { data, error } = await (await supabaseServer()).rpc("change_setting", { p_key: key, p_value: value as never, p_note: reason.trim() });
  if (error) return { status: error.code === "22023" ? "value" : "error" };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/fees");
  return { status: data ? "waiting" : "ok" };
}

export async function decideApproval(id: string, approve: boolean, reason: string): Promise<Result> {
  await assertUnlocked();
  if (reason.trim().length < 5) return { status: "reason" };
  const { error } = await (await supabaseServer()).rpc("decide_approval", { p_approval: id, p_approve: approve, p_note: reason.trim() });
  if (error) return { status: "error" };
  revalidatePath("/admin/approvals");
  return { status: "ok" };
}

export async function inviteStaff(email: string, role: string): Promise<Result> {
  await assertUnlocked();
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { status: "value" };
  const { data: token, error } = await (await supabaseServer()).rpc("create_staff_invite", { p_email: clean, p_role: role as never });
  if (error || typeof token !== "string") return { status: "error" };
  await sendStaffInviteEmail(clean, `${await requestOrigin()}/admin/invite/${token}`);
  revalidatePath("/admin/staff");
  return { status: "ok" };
}
