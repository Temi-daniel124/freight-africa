"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { checkAuthenticatorCode, passedCheck } from "@/features/auth/two-step-lock";

// The staff console's two-step sign-in (ux-admin X-00; SECURITY.md §3). Every step runs here on the
// server with the person's own session; the database functions check staff status and aal2 again.

export type EnrollStart = { status: "ok"; factorId: string; qr: string; secret: string } | { status: "error" };
export type ConfirmState = { status: "idle" | "wrong" | "error"; attempt: number; codes?: string[] };
export type VerifyState = { status: "idle" | "wrong" | "error"; attempt: number };
export type BackupState = { status: "idle" | "wrong" | "tooMany" | "error"; attempt: number };
export type InviteState = { status: "idle" | "used" | "otherEmail" | "error" };

const CODE = /^\d{6}$/;

/** Step 3: a new authenticator. Unfinished ones from an earlier try are removed first. */
export async function startEnroll(): Promise<EnrollStart> {
  const supabase = await supabaseServer();
  const { data: role } = await supabase.rpc("my_staff_role");
  if (!role) return { status: "error" };
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.some((factor) => factor.status === "verified")) return { status: "error" };
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Freight Africa staff", issuer: "Freight Africa" });
  if (error || !data) {
    console.error("mfa enroll failed", error?.code);
    return { status: "error" };
  }
  return { status: "ok", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Step 3, confirm: the first code turns two-step sign-in on (aal2), and the ten backup codes are made. */
export async function confirmEnroll(previous: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const attempt = previous.attempt + 1;
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!factorId || !CODE.test(code)) return { status: "wrong", attempt };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { status: error.code === "mfa_verification_failed" || error.status === 422 ? "wrong" : "error", attempt };
  const { data: codes, error: codesError } = await supabase.rpc("new_staff_backup_codes");
  if (codesError || !codes) {
    console.error("new_staff_backup_codes failed", codesError?.code);
    return { status: "error", attempt };
  }
  return { status: "idle", attempt, codes };
}

/** Every later sign-in: the code from the authenticator. */
export async function verifyStaffCode(previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const attempt = previous.attempt + 1;
  const code = String(formData.get("code") ?? "").trim();
  if (!CODE.test(code)) return { status: "wrong", attempt };
  const supabase = await supabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((item) => item.status === "verified");
  if (!factor) redirect("/admin/setup");
  const { data: me } = await supabase.auth.getClaims();
  const claims = me?.claims;
  if (!claims) redirect("/auth?mode=signin");
  // The same lock as every other authenticator check: five wrong codes in a row (X00j, review).
  const result = await checkAuthenticatorCode(claims.sub, typeof claims.email === "string" ? claims.email : null, () => supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code }));
  if (result === "locked") redirect("/auth/two-step/locked?next=%2Fadmin");
  if (result !== "ok") return { status: result, attempt };
  if (!(await passedCheck(supabase))) redirect("/auth/two-step/locked?next=%2Fadmin");
  redirect("/admin");
}

/**
 * Lost authenticator: one backup code (five wrong tries an hour lock it, in the database). A good code
 * removes the lost authenticator so a new one is set up; it never signs anyone in by itself.
 */
export async function spendBackupCode(previous: BackupState, formData: FormData): Promise<BackupState> {
  const attempt = previous.attempt + 1;
  const code = String(formData.get("code") ?? "").trim();
  if (code.replace(/[^0-9A-Za-z]/g, "").length !== 16) return { status: "wrong", attempt };
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth?next=/admin/recover");
  const { data: good, error } = await supabase.rpc("use_staff_backup_code", { p_code: code });
  if (error) return { status: error.code === "54000" ? "tooMany" : "error", attempt };
  if (!good) return { status: "wrong", attempt };

  const admin = supabaseAdmin();
  const { data: factors, error: listError } = await admin.auth.admin.mfa.listFactors({ userId });
  if (listError) {
    console.error("listing factors failed", listError.code);
    return { status: "error", attempt };
  }
  for (const factor of factors?.factors ?? []) {
    if (factor.factor_type !== "totp") continue;
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
    if (deleteError) {
      // The code is spent but the authenticator is still there: a super admin resets it (X-00 States).
      console.error("deleting the lost authenticator failed", deleteError.code);
      return { status: "error", attempt };
    }
  }
  const head = await headers();
  const { error: auditError } = await admin.from("audit_log").insert({
    actor_user_id: userId,
    actor_role: "user",
    action: "staff_backup_code_used",
    table_name: "staff_members",
    row_id: userId,
    new: { authenticator_removed: true },
    ip: (head.get("x-forwarded-for") ?? "").split(",")[0].slice(0, 300) || null,
    user_agent: head.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (auditError) console.error("audit of a backup code failed", auditError.code);
  // The session still carries the old aal claims; a fresh one is fetched before setting up again.
  await supabase.auth.refreshSession();
  redirect("/admin/setup");
}

/** Step 4: the staff code, read and agreed. */
export async function acceptStaffCode(): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("accept_staff_code");
  if (error) {
    console.error("accept_staff_code failed", error.code);
    redirect("/admin");
  }
  redirect("/admin/work");
}

/** Step 2 done: the person signed in with the invited email becomes staff, then sets up two-step sign-in. */
export async function acceptInvite(previous: InviteState, formData: FormData): Promise<InviteState> {
  const token = String(formData.get("token") ?? "");
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect(`/auth?next=${encodeURIComponent(`/admin/invite/${token}`)}`);
  const { error } = await supabase.rpc("accept_staff_invite", { p_token: token });
  if (error) {
    if (error.code === "P0002" || error.code === "23505") return { status: "used" };
    if (error.code === "42501") return { status: "otherEmail" };
    console.error("accept_staff_invite failed", error.code);
    return { status: "error" };
  }
  redirect("/admin/setup");
}
