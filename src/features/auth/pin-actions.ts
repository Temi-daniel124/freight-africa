"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ipKey, requestHome, requestIp } from "@/lib/ip-key";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { passesTurnstile, turnstileSiteKey } from "@/lib/turnstile";
import { sendCodeTo } from "./code-issue";
import { clearCodeProof, hasCodeProof } from "./code-proof-cookie";
import { safeNext } from "./next-path";
import { clearPendingCode } from "./pending";
import { NEW_PIN_COOKIE, TWO_STEP_OFFERED_COOKIE } from "./pin-cookies";
import { clearPinLogin, parseLogin, readPinLogin, setPinLogin } from "./pin-login";
import { finishSignIn, needsSecondStep, openSessionFor, sendSecurityEmail } from "./pin-session";
import { markUnlocked, secondStepDone } from "./unlock";
import { UNLOCK_COOKIE } from "./unlock-token";

// D044 sign-in and app lock. The PIN is checked only here, on our server, with the service key; the
// browser never reaches a function that accepts a PIN for sign-in.

export type LoginState = { status: "idle" | "invalid"; value: string; attempt: number };

/** A-01 Sign in: email (or phone, for people invited by phone), then the PIN keypad. */
export async function startPinSignIn(previous: LoginState, formData: FormData): Promise<LoginState> {
  const value = String(formData.get("login") ?? "");
  const parsed = parseLogin(value);
  if (!parsed) return { status: "invalid", value, attempt: previous.attempt + 1 };
  await setPinLogin({ ...parsed, next: safeNext(String(formData.get("next") ?? ""), await requestHome()) });
  redirect("/auth/pin");
}

export type PinSignInResult =
  | { status: "ok" | "twoStep"; next: string }
  | { status: "wrong"; left: number }
  | { status: "locked" | "none" | "limited" | "captcha" | "expired" | "error" };

/** A-13 on a new device: email or phone and the PIN. A right PIN opens a session made on the server. */
export async function signInWithPin(pin: string, captcha: string): Promise<PinSignInResult> {
  const login = await readPinLogin(await requestHome());
  if (!login) return { status: "expired" };
  if (!/^\d{6}$/.test(pin)) return { status: "wrong", left: 5 };
  const admin = supabaseAdmin();
  const ip = await ipKey();
  // After 2 wrong PINs from this internet address, the bot check (when Turnstile is switched on).
  if (turnstileSiteKey()) {
    const { data: failures } = await admin.rpc("pin_ip_failures", { p_ip_key: ip });
    if ((failures ?? 0) >= 2 && !(await passesTurnstile(captcha, await requestIp()))) return { status: "captcha" };
  }
  const { data, error } = await admin.rpc("pin_sign_in", { p_login: login.login, p_pin: pin, p_ip_key: ip });
  if (error || !data || typeof data !== "object") {
    console.error("pin_sign_in failed", error?.code ?? "no answer");
    return { status: "error" };
  }
  const result = data as { status: string; left?: number; just_locked?: boolean; user_id?: string; email?: string };
  if (result.status === "wrong") return { status: "wrong", left: Number(result.left ?? 0) };
  if (result.status === "locked") {
    if (result.just_locked && result.user_id) {
      const { data: user } = await admin.auth.admin.getUserById(result.user_id);
      await sendSecurityEmail(result.user_id, user?.user?.email, "locked");
    }
    return { status: "locked" };
  }
  if (result.status !== "ok" || !result.email) return { status: result.status === "limited" ? "limited" : "none" };

  const session = await openSessionFor(result.email);
  if (!session) return { status: "error" };
  await clearPinLogin();
  if (await needsSecondStep()) return { status: "twoStep", next: login.next };
  await finishSignIn(session.userId, session.sessionId, result.email);
  return { status: "ok", next: login.next };
}

/** "Forgot PIN?" on the sign-in keypad: an email code, then a new PIN. Phone accounts ask their owner. */
export async function forgotPin(): Promise<{ status: "phone" | "rateLimited" | "error" | "expired" }> {
  const login = await readPinLogin(await requestHome());
  if (!login) return { status: "expired" };
  if (login.kind === "phone") return { status: "phone" };
  const sent = await sendCodeTo(login.login, login.next);
  if (sent !== "ok") return { status: sent };
  (await cookies()).set(NEW_PIN_COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth", maxAge: 30 * 60 });
  redirect("/auth/code");
}

export type SetPinResult = { status: "ok"; next: string } | { status: "weak" | "fresh" | "error" };

/** A-11: the person's (new) PIN, after an email code, an invite or a PIN link. Opens the app. */
export async function chooseNewPin(pin: string, next: string): Promise<SetPinResult> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.session_id !== "string") return { status: "error" };
  // Replacing a PIN ("Forgot PIN?" or after a lockout) needs an email code confirmed in this session
  // (review of #85: a lockout alone was enough before). Otherwise Settings' Change PIN asks for the
  // current one.
  const { data: has } = await supabase.rpc("has_app_pin");
  // Fails closed: if we can't tell whether a PIN exists, treat it as existing.
  if (has !== false && !(await hasCodeProof(claims.sub, claims.session_id))) return { status: "fresh" };
  if (!(await secondStepDone())) return { status: "error" };
  const { error } = await supabase.rpc("set_app_pin", { p_pin: pin });
  if (error) return { status: error.code === "22023" ? "weak" : error.code === "28000" ? "fresh" : "error" };
  await markUnlocked(claims.sub, claims.session_id);
  (await cookies()).delete({ name: NEW_PIN_COOKIE, path: "/auth" });
  await clearCodeProof();
  const home = await requestHome();
  const target = safeNext(next, home);
  // A-12 is offered once on each device, never to staff (theirs is required and set up in the console).
  const offered = (await cookies()).get(TWO_STEP_OFFERED_COOKIE)?.value === "1";
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const { data: staff } = await supabase.rpc("my_staff_role");
  if (!offered && !staff && !factors?.totp.some((factor) => factor.status === "verified")) {
    return { status: "ok", next: `/auth/two-step/add?next=${encodeURIComponent(target)}` };
  }
  return { status: "ok", next: target };
}

export type UnlockResult = { status: "ok"; next: string } | { status: "wrong"; left: number } | { status: "locked" | "error" };

/** A-13 on the same device: the app was closed or unused; the PIN opens it. Five wrong PINs lock it. */
export async function unlockApp(pin: string, next: string): Promise<UnlockResult> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.session_id !== "string") return { status: "error" };
  const { data: answer, error } = await supabase.rpc("check_app_pin", { p_pin: pin });
  if (error) return { status: "error" };
  if (answer === "ok") {
    if (!(await secondStepDone())) return { status: "error" };
    await markUnlocked(claims.sub, claims.session_id);
    return { status: "ok", next: safeNext(next, await requestHome()) };
  }
  if (answer === "locked") {
    const { data: user } = await supabaseAdmin().auth.admin.getUserById(claims.sub);
    await sendSecurityEmail(claims.sub, user?.user?.email, "locked");
    await supabase.auth.signOut({ scope: "local" });
    return { status: "locked" };
  }
  if (answer === "none") return { status: "error" };
  const { data: left } = await supabase.rpc("my_pin_tries_left");
  return { status: "wrong", left: typeof left === "number" ? left : 0 };
}

/** Locked out, or "Use a different account": sign out of this device and start again. */
export async function signOutToStart(): Promise<void> {
  await (await supabaseServer()).auth.signOut({ scope: "local" });
  // Nothing of this sign-in is left for the next person on a shared phone (review of #85).
  const jar = await cookies();
  jar.delete({ name: UNLOCK_COOKIE, path: "/" });
  jar.delete({ name: NEW_PIN_COOKIE, path: "/auth" });
  await Promise.all([clearPinLogin(), clearPendingCode(), clearCodeProof()]);
  redirect("/auth?mode=signin");
}
