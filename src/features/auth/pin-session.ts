import "server-only";
import { resendEmailSender } from "@/lib/email/sender";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { deviceContext, deviceHash, deviceId } from "./device";
import { lockLinkToken } from "./lock-link";
import { realEmail } from "./phone-account";
import { securityEmail, type SecurityEmailKind } from "./security-email";
import { markUnlocked } from "./unlock";

/**
 * D044: after a right PIN (or a PIN link), our server opens the session itself and no email is sent:
 * an admin magic-link token, verified here on the server, which sets the session cookies. The token
 * never reaches the browser. Returns the new session's ids, or null if it couldn't be made.
 */
export async function openSessionFor(email: string): Promise<{ userId: string; sessionId: string } | null> {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("generateLink for PIN sign-in failed", error?.code ?? "no token");
    return null;
  }
  const supabase = await supabaseServer();
  const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (verifyError) {
    console.error("verifyOtp for PIN sign-in failed", verifyError.code ?? verifyError.status);
    return null;
  }
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const sessionId = claims?.claims?.session_id;
  return typeof userId === "string" && typeof sessionId === "string" ? { userId, sessionId } : null;
}

/** Whether this account must pass the authenticator code before the app opens (two-step on, or staff). */
export async function needsSecondStep(): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") return true;
  const { data: staff } = await supabase.rpc("my_staff_role");
  return !!staff && data?.currentLevel !== "aal2";
}

/** Sends a security email (new device or PIN lock) to an account's real address; never fails the sign-in. */
export async function sendSecurityEmail(userId: string, email: string | null | undefined, kind: SecurityEmailKind, label?: string, city?: string) {
  const to = realEmail(email);
  if (!to) return;
  try {
    const context = label === undefined ? await deviceContext() : { label, city: city ?? "" };
    const link = `${await requestOrigin()}/auth/lock?t=${encodeURIComponent(lockLinkToken(userId))}`;
    await resendEmailSender().send(securityEmail(kind, to, context.label, context.city, link));
  } catch (error) {
    console.error("security email failed", error instanceof Error ? error.message : "unknown");
  }
}

/**
 * Every successful sign-in on a device (email code, PIN or PIN link): remember the device, email the
 * person if it is a new one, and open the app (the PIN, or the email code, has just been given).
 */
export async function finishSignIn(userId: string, sessionId: string, email: string | null | undefined) {
  const id = await deviceId();
  const { label, city } = await deviceContext();
  const { data: isNew, error } = await supabaseAdmin().rpc("record_device", { p_user: userId, p_device_hash: deviceHash(id), p_label: label, p_city: city });
  if (error) console.error("record_device failed", error.code);
  if (isNew === true) await sendSecurityEmail(userId, email, "newDevice", label, city);
  await markUnlocked(userId, sessionId);
}
