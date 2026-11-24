import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_LOCK_MINUTES, UNLOCK_COOKIE, unlockCookieOptions, unlockToken, unlockTokenValid } from "./unlock-token";

/** app_lock_minutes (D044), read once per request; 15 if the setting can't be read. */
export const lockMinutes = cache(async (): Promise<number> => {
  const { data } = await supabaseAdmin().from("settings").select("value").eq("key", "app_lock_minutes").maybeSingle();
  const minutes = Number(data?.value);
  return Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440 ? Math.floor(minutes) : DEFAULT_LOCK_MINUTES;
});

/** After the right PIN, a new PIN or a fresh sign-in: the app is open on this device. Server actions only. */
export async function markUnlocked(userId: string, sessionId: string) {
  (await cookies()).set(UNLOCK_COOKIE, unlockToken(userId, sessionId, await lockMinutes()), unlockCookieOptions);
}

export async function isUnlocked(userId: string, sessionId: string) {
  return unlockTokenValid((await cookies()).get(UNLOCK_COOKIE)?.value, userId, sessionId);
}

type Gate = { userId: string; sessionId: string } | null;

/**
 * D044: every shell page and every server action that reads private data. A signed-in person must have
 * a PIN and have opened the app with it within app_lock_minutes on this device. Someone with no PIN yet
 * sets one first. Fails closed: if we can't tell, the PIN screen is shown. Signed-out visitors pass
 * through (the page's own sign-in check sends them to /auth).
 */
export const requireUnlocked = cache(async (next = "/app"): Promise<Gate> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
  // Two-step on (or staff): the authenticator code comes before anything private (D044).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect(`/auth/two-step?next=${encodeURIComponent(next)}`);
  if (sessionId && (await isUnlocked(claims.sub, sessionId))) return { userId: claims.sub, sessionId };
  const { data: has, error } = await supabase.rpc("has_app_pin");
  const back = `?next=${encodeURIComponent(next)}`;
  if (!error && has === false) redirect(`/auth/pin/new${back}`);
  redirect(`/auth/unlock${back}`);
});

/** For server actions: the same check, returning false instead of redirecting (the action refuses). */
export async function isUnlockedNow(): Promise<boolean> {
  const { data } = await (await supabaseServer()).auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.session_id !== "string") return false;
  return isUnlocked(claims.sub, claims.session_id);
}

/** First line of every server action that reads or changes private data (D044): refuse a locked app. */
export async function assertUnlocked(): Promise<void> {
  if (!(await isUnlockedNow())) throw new Error("The app is locked. Enter your PIN.");
}
