import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env.server";

// D042: the PIN opens the app; it never signs anyone in. After the right PIN the server sets this
// cookie, signed for this person and this sign-in session, and it lasts until the app is closed
// (a session cookie). A new sign-in or another person's session can't reuse it.

export const UNLOCK_COOKIE = "fa_unlocked";

function token(userId: string, sessionId: string) {
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`app-pin:${userId}:${sessionId}`).digest("hex");
}

export async function markUnlocked(userId: string, sessionId: string) {
  (await cookies()).set(UNLOCK_COOKIE, token(userId, sessionId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
}

export async function isUnlocked(userId: string, sessionId: string) {
  const value = (await cookies()).get(UNLOCK_COOKIE)?.value ?? "";
  const expected = token(userId, sessionId);
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
