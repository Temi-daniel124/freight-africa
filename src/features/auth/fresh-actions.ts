"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { issueCode } from "./code-issue";
import { codeKey } from "./pending";
import { realEmail } from "./phone-account";
import { assertUnlocked, markUnlocked } from "./unlock";

// D044 / SECURITY §3: the fresh check before a sensitive action (team roles now; bank account and
// payouts use it too). Two-step on: the authenticator code. Otherwise: an email code. Either one gives
// the session a fresh sign-in time, which the database checks (signed_in_within 15 minutes).

export type FreshMethod = "totp" | "email" | "none";

export async function freshMethod(): Promise<FreshMethod> {
  const supabase = await supabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.some((f) => f.status === "verified")) return "totp";
  const { data } = await supabase.auth.getClaims();
  return realEmail(typeof data?.claims?.email === "string" ? data.claims.email : "") ? "email" : "none";
}

/** Sends an email code to the signed-in person's own address (the usual per-hour limits apply). */
export async function sendFreshCode(): Promise<{ status: "sent" | "rateLimited" | "error" }> {
  // Only from an open app: a locked app is opened with the PIN, never with this (review).
  await assertUnlocked();
  const { data } = await (await supabaseServer()).auth.getClaims();
  const email = realEmail(typeof data?.claims?.email === "string" ? data.claims.email : "");
  if (!email) return { status: "error" };
  const issued = await issueCode("email", email);
  if (!issued.ok) return { status: issued.reason === "rate_limited" ? "rateLimited" : "error" };
  return { status: "sent" };
}

/** The code from the authenticator app or the email; five wrong email codes lock it, as at sign-in. */
export async function confirmFresh(code: string): Promise<{ status: "ok" | "wrong" | "locked" | "error" }> {
  await assertUnlocked();
  if (!/^\d{6}$/.test(code)) return { status: "wrong" };
  const supabase = await supabaseServer();
  const method = await freshMethod();
  if (method === "totp") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (!factor) return { status: "error" };
    const { data: me } = await supabase.auth.getClaims();
    const userId = me?.claims?.sub;
    if (!userId) return { status: "error" };
    // Five wrong authenticator codes an hour lock the fresh check (security review).
    const { data: allowed } = await supabaseAdmin().rpc("fresh_try", { p_user: userId });
    if (allowed !== true) return { status: "locked" };
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) return { status: "wrong" };
    return (await record()) ? { status: "ok" } : { status: "error" };
  }
  if (method !== "email") return { status: "error" };
  const { data } = await supabase.auth.getClaims();
  const email = realEmail(typeof data?.claims?.email === "string" ? data.claims.email : "");
  const admin = supabaseAdmin();
  const key = codeKey("email", email);
  const { data: left } = await admin.rpc("auth_code_try", { p_key: key });
  if (typeof left !== "number") return { status: "error" };
  if (left < 0) return { status: "locked" };
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return { status: left === 0 ? "locked" : "wrong" };
  await admin.rpc("auth_code_passed", { p_key: key });
  // The email code opened a new session; the app was already open (checked above), so it stays open on it.
  const { data: fresh } = await supabase.auth.getClaims();
  if (fresh?.claims && typeof fresh.claims.session_id === "string") await markUnlocked(fresh.claims.sub, fresh.claims.session_id);
  return (await record()) ? { status: "ok" } : { status: "error" };
}

/** The server records the passed check for this session; the database reads it (fresh_ok). */
async function record(): Promise<boolean> {
  const { data } = await (await supabaseServer()).auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.session_id !== "string") return false;
  const { error } = await supabaseAdmin().rpc("record_fresh_check", { p_user: claims.sub, p_session: claims.session_id });
  return !error;
}
