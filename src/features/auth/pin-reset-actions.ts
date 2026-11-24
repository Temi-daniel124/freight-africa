"use server";

import { createHash, randomBytes } from "node:crypto";
import { requestOrigin } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { pinIsWeak } from "./pin-rules";
import { finishSignIn, openSessionFor } from "./pin-session";
import { isUnlockedNow } from "./unlock";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type ResetLinkResult = { status: "ok"; link: string } | { status: "error" };

/**
 * D044 "Send a new PIN link" on Drivers or Team: for a member invited by phone who forgot their PIN. The
 * database checks the caller manages that business and that the member has no email of their own.
 * The link is shown once, for the owner to share from their own WhatsApp; only its hash is stored.
 */
export async function makePinResetLink(orgId: string, memberId: string): Promise<ResetLinkResult> {
  if (!(await isUnlockedNow())) return { status: "error" };
  const token = randomBytes(32).toString("base64url");
  const { error } = await (await supabaseServer()).rpc("create_pin_reset_link", { p_org: orgId, p_member: memberId, p_token_hash: hash(token) });
  if (error) {
    console.error("create_pin_reset_link failed", error.code);
    return { status: "error" };
  }
  return { status: "ok", link: `${await requestOrigin()}/auth/reset/${token}` };
}

export type ResetResult = { status: "ok"; next: string } | { status: "weak" | "used" | "error" };

/** The member opens the link and chooses a new PIN; the link is spent only once the PIN is set (review). */
export async function resetPinWithLink(token: string, pin: string): Promise<ResetResult> {
  if (pinIsWeak(pin)) return { status: "weak" };
  const admin = supabaseAdmin();
  const { data: rows, error } = await admin.rpc("peek_pin_reset_account", { p_token_hash: hash(token) });
  const row = rows?.[0];
  if (error || !row) return { status: "used" };
  const session = await openSessionFor(row.email);
  if (!session) return { status: "error" };
  const supabase = await supabaseServer();
  // A fresh sign-in, so set_app_pin replaces the old PIN and clears the lockout.
  const { error: pinError } = await supabase.rpc("set_app_pin", { p_pin: pin });
  if (pinError) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: pinError.code === "22023" ? "weak" : "error" };
  }
  const { data: spent } = await admin.rpc("use_pin_reset_link", { p_token_hash: hash(token), p_keep_session: session.sessionId });
  if (spent !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "used" };
  }
  await finishSignIn(session.userId, session.sessionId, null);
  return { status: "ok", next: "/app" };
}
