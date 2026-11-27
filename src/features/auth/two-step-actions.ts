"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requestHome } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "./next-path";
import { clearCodeProof } from "./code-proof-cookie";
import { NEW_PIN_COOKIE, TWO_STEP_OFFERED_COOKIE } from "./pin-cookies";
import { finishSignIn, mustChoosePin } from "./pin-session";
import { sendCodeTo } from "./code-issue";
import { checkAuthenticatorCode, passedCheck, twoStepLocked } from "./two-step-lock";
import { realEmail } from "./phone-account";

// D044 optional two-step sign-in for everyone (staff keep theirs in the console, required).

const CODE = /^\d{6}$/;

export type EnrollStart = { status: "ok"; factorId: string; qr: string; secret: string } | { status: "error" };
export type ConfirmState = { status: "idle" | "wrong" | "error"; attempt: number; codes?: string[] };
export type CodeState = { status: "idle" | "wrong" | "error"; attempt: number };
export type BackupState = { status: "idle" | "wrong" | "tooMany" | "error"; attempt: number };

async function offered() {
  (await cookies()).set(TWO_STEP_OFFERED_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
}

/** A-12: a new authenticator (unfinished ones from an earlier try are removed first). */
export async function startTwoStep(): Promise<EnrollStart> {
  const supabase = await supabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (!factors || factors.totp.some((factor) => factor.status === "verified")) return { status: "error" };
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Freight Africa", issuer: "Freight Africa" });
  if (error || !data) {
    console.error("mfa enroll failed", error?.code);
    return { status: "error" };
  }
  return { status: "ok", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** A-12 confirm: the first code turns it on (aal2), then the ten backup codes are made. */
export async function confirmTwoStep(previous: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const attempt = previous.attempt + 1;
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!factorId || !CODE.test(code)) return { status: "wrong", attempt };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { status: error.code === "mfa_verification_failed" || error.status === 422 ? "wrong" : "error", attempt };
  await offered();
  const { data: codes, error: codesError } = await supabase.rpc("new_backup_codes");
  if (codesError || !codes) {
    console.error("new_backup_codes failed", codesError?.code);
    return { status: "error", attempt };
  }
  return { status: "idle", attempt, codes };
}

/** "Not now" on A-12: not offered again on this device. */
export async function skipTwoStep(formData: FormData): Promise<void> {
  await offered();
  redirect(safeNext(String(formData.get("next") ?? ""), await requestHome()));
}

/** Sign-in with two-step on (or staff): the authenticator code, then the app opens. */
export async function verifyTwoStep(previous: CodeState, formData: FormData): Promise<CodeState> {
  const attempt = previous.attempt + 1;
  const code = String(formData.get("code") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""), await requestHome());
  if (!CODE.test(code)) return { status: "wrong", attempt };
  const supabase = await supabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((item) => item.status === "verified");
  if (!factor) redirect(next);
  const { data: me } = await supabase.auth.getClaims();
  const userId = me?.claims?.sub;
  if (!userId) redirect("/auth?mode=signin");
  const email = typeof me?.claims?.email === "string" ? me.claims.email : null;
  // Five wrong codes in a row lock two-step sign-in until an email code (admin X00j).
  const result = await checkAuthenticatorCode(userId, email, () => supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code }));
  if (result === "locked") redirect(`/auth/two-step/locked?next=${encodeURIComponent(next)}`);
  if (result !== "ok") return { status: result, attempt };
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  // The authenticator code was just given: that is also a fresh check for this session, and clears the
  // tries. If a lock landed while this code was in flight, the session is signed out (review).
  if (!(await passedCheck(supabase))) redirect(`/auth/two-step/locked?next=${encodeURIComponent(next)}`);
  if (claims && typeof claims.session_id === "string") await afterSecondStep(supabase, claims.sub, claims.session_id, typeof claims.email === "string" ? claims.email : null, next);
  redirect(next);
}

/** Lost authenticator: one backup code removes it, so the person signs in and can add a new one. */
export async function spendTwoStepBackup(previous: BackupState, formData: FormData): Promise<BackupState> {
  const attempt = previous.attempt + 1;
  const code = String(formData.get("code") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""), await requestHome());
  if (code.replace(/[^0-9A-Za-z]/g, "").length !== 16) return { status: "wrong", attempt };
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth?mode=signin");
  const { data: staff } = await supabase.rpc("my_staff_role");
  if (staff) redirect("/admin/recover");
  const { data: good, error } = await supabase.rpc("use_backup_code", { p_code: code });
  if (error) return { status: error.code === "54000" ? "tooMany" : "error", attempt };
  if (!good) return { status: "wrong", attempt };
  const admin = supabaseAdmin();
  const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId });
  for (const factor of factors?.factors ?? []) {
    if (factor.factor_type !== "totp") continue;
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
    if (deleteError) {
      console.error("deleting the lost authenticator failed", deleteError.code);
      return { status: "error", attempt };
    }
  }
  await supabase.auth.refreshSession();
  const { data: fresh } = await supabase.auth.getClaims();
  const c = fresh?.claims;
  if (c && typeof c.session_id === "string") await afterSecondStep(supabase, c.sub, c.session_id, typeof c.email === "string" ? c.email : null, next);
  redirect(next);
}

export type UnlockCodeState = { status: "idle" | "rateLimited" | "error" };

/** X00j "Send me the email code": the code that clears the lock, to the account's own email. */
export async function sendTwoStepUnlockCode(_previous: UnlockCodeState, formData: FormData): Promise<UnlockCodeState> {
  const next = safeNext(String(formData.get("next") ?? ""), await requestHome());
  const { data } = await (await supabaseServer()).auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/auth?mode=signin");
  if (!(await twoStepLocked(claims.sub))) redirect(`/auth/two-step?next=${encodeURIComponent(next)}`);
  const email = realEmail(typeof claims.email === "string" ? claims.email : "");
  if (!email) return { status: "error" };
  const sent = await sendCodeTo(email, next);
  if (sent !== "ok") return { status: sent };
  redirect("/auth/code");
}

/**
 * After the second step: the same choice /auth/done makes (review of #93). With no PIN, a locked PIN or
 * "Forgot PIN?", the app stays shut and Choose a PIN follows (it needs the code proof, kept for it);
 * otherwise the app opens and the proof is spent.
 */
async function afterSecondStep(supabase: Awaited<ReturnType<typeof supabaseServer>>, userId: string, sessionId: string, email: string | null, next: string) {
  const wantsNew = (await cookies()).get(NEW_PIN_COOKIE)?.value === "1";
  const choose = await mustChoosePin(supabase, wantsNew);
  await finishSignIn(userId, sessionId, email, !choose);
  if (choose) redirect(`/auth/pin/new?next=${encodeURIComponent(next)}`);
  await clearCodeProof();
}
