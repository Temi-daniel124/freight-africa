"use server";

import { redirect } from "next/navigation";
import { requestHome, requestIp, requestOrigin } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { passesTurnstile, turnstileSiteKey } from "@/lib/turnstile";
import { issueCode } from "./code-issue";
import { safeNext } from "./next-path";
import { signInOptions } from "./options";
import { clearPendingCode, codeKey, readPendingCode, setPendingCode } from "./pending";
import { codeExpired } from "./pending-seal";
import { parseCode, parseDestination, type CodeChannel } from "./schema";
import type { ResendState, SendState, VerifyState } from "./state";

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function sendCode(previous: SendState, formData: FormData): Promise<SendState> {
  const requested = text(formData, "channel") === "whatsapp" ? "whatsapp" : "email";
  // A switched-off method can't be forced by editing the form.
  const channel: CodeChannel = requested === "whatsapp" && signInOptions().whatsapp ? "whatsapp" : "email";
  const value = text(formData, channel === "whatsapp" ? "phone" : "email");
  const attempt = previous.attempt + 1;

  const to = requested === channel ? parseDestination(channel, value) : null;
  if (!to) return { status: "invalid", channel: requested, value, attempt };

  // Bot check (Cloudflare Turnstile), when switched on. A token works once: for email we check it here,
  // because our code is made through the admin API; for WhatsApp, Supabase Auth checks it itself.
  const captcha = text(formData, "captcha");
  if (channel === "email" ? !(await passesTurnstile(captcha, await requestIp())) : turnstileSiteKey() !== null && !captcha) {
    return { status: "captcha", channel, value, attempt };
  }

  const issued = await issueCode(channel, to, captcha || undefined);
  if (!issued.ok) return { status: issued.reason, channel, value, attempt };

  await setPendingCode({ channel, to, next: safeNext(text(formData, "next"), await requestHome()), length: issued.length, sentAt: Date.now() });
  redirect("/auth/code");
}

export async function resendCode(previous: ResendState): Promise<ResendState> {
  const attempt = previous.attempt + 1;
  const pending = await readPendingCode();
  if (!pending) redirect("/auth");

  const issued = await issueCode(pending.channel, pending.to);
  if (!issued.ok) return { status: issued.reason, attempt };
  await setPendingCode({ ...pending, length: issued.length, sentAt: Date.now() });
  return { status: "sent", attempt };
}

export async function verifyCode(previous: VerifyState, formData: FormData): Promise<VerifyState> {
  const attempt = previous.attempt + 1;
  const pending = await readPendingCode();
  if (!pending) redirect("/auth");

  // A code past its ten minutes can't be right, so it isn't counted as a wrong try.
  if (codeExpired(pending)) return { status: "expired", attempt };

  const code = parseCode(text(formData, "code"), pending.length);
  if (!code) return { status: "wrong", attempt };

  const admin = supabaseAdmin();
  const key = codeKey(pending.channel, pending.to);
  // The try is counted before the code is checked, in one database statement, so guesses sent at the
  // same moment can't all slip past the limit of five.
  const { data: left, error: tryError } = await admin.rpc("auth_code_try", { p_key: key });
  if (tryError || typeof left !== "number") {
    console.error("auth_code_try failed", tryError?.code ?? "no count");
    return { status: "error", attempt };
  }
  if (left < 0) return { status: "locked", attempt };

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
      // The code was never checked, so the try is given back.
      await admin.rpc("auth_code_refund", { p_key: key });
      return { status: "error", attempt };
    }
    return { status: left === 0 ? "locked" : "wrong", attempt };
  }

  await admin.rpc("auth_code_passed", { p_key: key });
  // The screen shows the boxes turning green, then opens /auth/done, which clears the "code on its way"
  // cookie and goes to `next`. Clearing it here would re-render this page into a redirect too early.
  return { status: "ok", attempt };
}

export async function signInWithGoogle(formData: FormData) {
  if (!signInOptions().google) redirect("/auth");
  const next = safeNext(text(formData, "next"), await requestHome());
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
