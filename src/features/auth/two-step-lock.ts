import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendSecurityEmail } from "./pin-session";

// Our own lock on authenticator codes (admin X00j, SECURITY §3): five wrong codes in a row, at sign-in
// or in a fresh check, lock two-step sign-in until an email code is confirmed at sign-in. The try is
// counted before the code is checked, so codes sent at the same moment can't all slip past the limit.

export type AuthenticatorCheck = "ok" | "wrong" | "locked" | "error";

type VerifyError = { status?: number; code?: string } | null;

/** True when Supabase said the code itself was wrong (not that the service failed). */
export function isWrongCode(error: VerifyError): boolean {
  return !!error && (error.status === 422 || error.code === "mfa_verification_failed" || error.code === "mfa_challenge_expired");
}

export async function checkAuthenticatorCode(userId: string, email: string | null | undefined, verify: () => Promise<{ error: VerifyError }>): Promise<AuthenticatorCheck> {
  const admin = supabaseAdmin();
  const { data: allowed, error: tryError } = await admin.rpc("fresh_try", { p_user: userId });
  if (tryError) {
    console.error("fresh_try failed", tryError.code);
    return "error";
  }
  if (allowed !== true) return "locked";
  const { error } = await verify();
  if (!error) return "ok";
  if (!isWrongCode(error)) {
    // The code was never really checked, so the try is given back.
    await admin.rpc("fresh_refund", { p_user: userId });
    console.error("authenticator check failed", error.code ?? error.status);
    return "error";
  }
  const { data: justLocked } = await admin.rpc("fresh_wrong", { p_user: userId });
  if (justLocked !== true) return "wrong";
  // The same alert as the PIN lock, with the "Lock your account" link.
  await sendSecurityEmail(userId, email, "twoStepLocked");
  return "locked";
}

export async function twoStepLocked(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().rpc("two_step_locked", { p_user: userId });
  return data === true;
}

/** An email code was confirmed at sign-in: two-step sign-in opens again, from zero tries. */
export async function clearTwoStepLock(userId: string): Promise<void> {
  const { error } = await supabaseAdmin().rpc("clear_two_step_lock", { p_user: userId });
  if (error) console.error("clear_two_step_lock failed", error.code);
}
