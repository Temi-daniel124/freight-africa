import "server-only";
import { resendEmailSender } from "@/lib/email/sender";
import { ipKey, requestHome } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { signInCodeEmail } from "./code-email";
import { safeNext } from "./next-path";
import { codeKey, setPendingCode } from "./pending";
import type { CodeChannel } from "./schema";

// WhatsApp codes are six digits (Supabase phone codes); email codes follow the project's setting.
const WHATSAPP_CODE_LENGTH = 6;

type Issued = { ok: true; length: number } | { ok: false; reason: "rate_limited" | "error" };

/** Counts the request, then issues a code and delivers it. No personal data is logged (AGENT.md 6). */
export async function issueCode(channel: CodeChannel, to: string, captchaToken?: string): Promise<Issued> {
  // The secret-key client is needed here: the counting functions are service_role only, and
  // auth.admin.generateLink creates the code without Supabase sending its own email.
  const admin = supabaseAdmin();
  const { data: allowed, error: limitError } = await admin.rpc("auth_code_sending", {
    p_key: codeKey(channel, to),
    p_ip_key: await ipKey(),
  });
  if (limitError) {
    console.error("auth_code_sending failed", limitError.code);
    return { ok: false, reason: "error" };
  }
  if (!allowed) return { ok: false, reason: "rate_limited" };

  if (channel === "whatsapp") {
    // Supabase creates the code and calls /api/auth/sms-hook, which delivers it on WhatsApp.
    const { error } = await (await supabaseServer()).auth.signInWithOtp({ phone: to, options: { captchaToken } });
    if (error) {
      console.error("whatsapp code failed", error.code ?? error.status);
      return { ok: false, reason: "error" };
    }
    return { ok: true, length: WHATSAPP_CODE_LENGTH };
  }

  // "magiclink" also creates the account when the email is new, so one screen signs in and signs up.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: to });
  const code = data?.properties?.email_otp;
  if (error || !code) {
    console.error("email code failed", error?.code ?? error?.status ?? "no code");
    return { ok: false, reason: "error" };
  }
  try {
    await resendEmailSender().send(signInCodeEmail(to, code));
  } catch (sendError) {
    console.error("sign-in code email failed", sendError instanceof Error ? sendError.message : "unknown");
    return { ok: false, reason: "error" };
  }
  return { ok: true, length: code.length };
}

/** D044 "Forgot your PIN?": an email code to an account's address, then the code screen. */
export async function sendCodeTo(email: string, next: string): Promise<"ok" | "rateLimited" | "error"> {
  const issued = await issueCode("email", email);
  if (!issued.ok) return issued.reason === "rate_limited" ? "rateLimited" : "error";
  await setPendingCode({ channel: "email", to: email, next: safeNext(next, await requestHome()), length: issued.length, sentAt: Date.now() });
  return "ok";
}

