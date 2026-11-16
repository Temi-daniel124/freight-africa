"use server";

import { redirect } from "next/navigation";
import { resendEmailSender } from "@/lib/email/sender";
import { ipKey, requestOrigin } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { signInCodeEmail } from "./code-email";
import { safeNext } from "./next-path";
import { signInOptions } from "./options";
import { clearPendingCode, codeKey, readPendingCode, setPendingCode } from "./pending";
import { parseCode, parseDestination, type CodeChannel } from "./schema";
import type { ResendState, SendState, VerifyState } from "./state";

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

// WhatsApp codes are six digits (Supabase phone codes); email codes follow the project's setting.
const WHATSAPP_CODE_LENGTH = 6;

type Issued = { ok: true; length: number } | { ok: false; reason: "rate_limited" | "error" };

/** Counts the request, then issues a code and delivers it. No personal data is logged (AGENT.md 6). */
async function issueCode(channel: CodeChannel, to: string): Promise<Issued> {
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
    const { error } = await (await supabaseServer()).auth.signInWithOtp({ phone: to });
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

export async function sendCode(previous: SendState, formData: FormData): Promise<SendState> {
  const requested = text(formData, "channel") === "whatsapp" ? "whatsapp" : "email";
  // A switched-off method can't be forced by editing the form.
  const channel: CodeChannel = requested === "whatsapp" && signInOptions().whatsapp ? "whatsapp" : "email";
  const value = text(formData, channel === "whatsapp" ? "phone" : "email");
  const attempt = previous.attempt + 1;

  const to = requested === channel ? parseDestination(channel, value) : null;
  if (!to) return { status: "invalid", channel: requested, value, attempt };

  const issued = await issueCode(channel, to);
  if (!issued.ok) return { status: issued.reason, channel, value, attempt };

  await setPendingCode({ channel, to, next: safeNext(text(formData, "next")), length: issued.length });
  redirect("/auth/code");
}

export async function resendCode(previous: ResendState): Promise<ResendState> {
  const attempt = previous.attempt + 1;
  const pending = await readPendingCode();
  if (!pending) redirect("/auth");

  const issued = await issueCode(pending.channel, pending.to);
  if (!issued.ok) return { status: issued.reason, attempt };
  await setPendingCode({ ...pending, length: issued.length });
  return { status: "sent", attempt };
}

export async function verifyCode(previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const attempt = previous.attempt + 1;
  const pending = await readPendingCode();
  if (!pending) redirect("/auth");

  const code = parseCode(text(formData, "code"), pending.length);
  if (!code) return { status: "wrong", attempt };

  const admin = supabaseAdmin();
  const key = codeKey(pending.channel, pending.to);
  const { data: open, error: openError } = await admin.rpc("auth_code_open", { p_key: key });
  if (openError) {
    console.error("auth_code_open failed", openError.code);
    return { status: "error", attempt };
  }
  if (!open) return { status: "locked", attempt };

  const supabase = await supabaseServer();
  const { error } =
    pending.channel === "email"
      ? await supabase.auth.verifyOtp({ email: pending.to, token: code, type: "email" })
      : await supabase.auth.verifyOtp({ phone: pending.to, token: code, type: "sms" });

  if (error) {
    // Supabase answers 4xx for a wrong or expired code; anything else is our problem, not a wrong try.
    // 429 is Supabase's own rate limit, which says nothing about this code.
    if (!error.status || error.status >= 500 || error.status === 429) {
      console.error("verifyOtp failed", error.code ?? error.status);
      return { status: "error", attempt };
    }
    const { data: left } = await admin.rpc("auth_code_failed", { p_key: key });
    return { status: left === 0 ? "locked" : "wrong", attempt };
  }

  await admin.rpc("auth_code_passed", { p_key: key });
  // The screen shows the boxes turning green, then opens /auth/done, which clears the "code on its way"
  // cookie and goes to `next`. Clearing it here would re-render this page into a redirect too early.
  return { status: "ok", attempt };
}

export async function signInWithGoogle(formData: FormData) {
  if (!signInOptions().google) redirect("/auth");
  const next = safeNext(text(formData, "next"));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) {
    console.error("google sign-in failed", error?.code ?? "no url");
    redirect("/auth?error=google");
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await supabaseServer();
  // "local" ends this device's session only; "Sign out everywhere" lives in Settings (A-10).
  await supabase.auth.signOut({ scope: "local" });
  await clearPendingCode();
  redirect("/auth");
}
