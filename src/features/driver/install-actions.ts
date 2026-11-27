"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { finishSignIn, openSessionFor } from "@/features/auth/pin-session";
import { normaliseNigerianPhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

// D052 install detection. Tapping Install only means Waiting; the app counts as installed when it runs
// from the home screen and checks in (install_checkin with standalone true).

type Platform = "android" | "ios" | "desktop" | "other";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLATFORMS: Platform[] = ["android", "ios", "desktop", "other"];
const clean = (device: string, platform: string) => (UUID.test(device) && PLATFORMS.includes(platform as Platform) ? { device, platform } : null);

export async function installStarted(device: string, platform: string): Promise<boolean> {
  const input = clean(device, platform);
  if (!input) return false;
  const { error } = await (await supabaseServer()).rpc("install_started", { p_device: input.device, p_platform: input.platform });
  return !error;
}

/** Returns whether this person has an installed app (true once the home-screen app has checked in). */
export async function installCheckin(device: string, platform: string, standalone: boolean): Promise<boolean> {
  const input = clean(device, platform);
  if (!input) return false;
  const { data, error } = await (await supabaseServer()).rpc("install_checkin", { p_device: input.device, p_platform: input.platform, p_standalone: standalone === true });
  return !error && data === true;
}

/** DV05d: a one-time 6-digit code for the iPhone home-screen app, which starts signed out. */
export async function makeSetupCode(): Promise<{ code: string } | { status: "limit" | "error" }> {
  await assertUnlocked();
  const { data, error } = await (await supabaseServer()).rpc("create_install_code");
  if (error || typeof data !== "string") return { status: error?.code === "22023" ? "limit" : "error" };
  return { code: data };
}

/**
 * In the home-screen app: phone number and setup code. The code is checked only on our server with the
 * service key (single use, five tries, ten a number in 15 minutes). The session opens locked: the PIN
 * screen comes next (D044).
 */
export async function signInWithSetupCode(phone: string, code: string): Promise<{ status: "ok" | "wrong" | "error" }> {
  const e164 = normaliseNigerianPhone(phone);
  if (!e164 || !/^\d{6}$/.test(code.replace(/\s/g, ""))) return { status: "wrong" };
  const admin = supabaseAdmin();
  const { data: userId, error } = await admin.rpc("redeem_install_code", { p_phone: e164, p_code: code.replace(/\s/g, "") });
  if (error) {
    console.error("redeem_install_code failed", error.code);
    return { status: "error" };
  }
  if (!userId) return { status: "wrong" };
  const { data: user } = await admin.auth.admin.getUserById(userId);
  if (!user?.user?.email || user.user.banned_until) return { status: "wrong" };
  const session = await openSessionFor(user.user.email);
  if (!session) return { status: "error" };
  await finishSignIn(session.userId, session.sessionId, user.user.email, false);
  return { status: "ok" };
}
