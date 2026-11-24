import { createHmac, timingSafeEqual } from "node:crypto";

// D044: the app-lock token. Signed for one person and one sign-in session, with an expiry that slides
// forward while the app is used (the proxy renews it on each signed-in request). Closed or unused for
// app_lock_minutes and it expires, so the PIN is asked again. Shared by the proxy and server code, so
// it reads the secret from the environment directly and imports nothing server-only.

export const UNLOCK_COOKIE = "fa_unlocked";
export const DEFAULT_LOCK_MINUTES = 15;

function secret() {
  const value = process.env.CODE_HMAC_SECRET;
  if (!value) throw new Error("CODE_HMAC_SECRET is not set");
  return value;
}

function sign(userId: string, sessionId: string, expires: number, minutes: number) {
  return createHmac("sha256", secret()).update(`app-unlock:${userId}:${sessionId}:${expires}:${minutes}`).digest("hex");
}

/** "<expires>.<minutes>.<mac>": the lock period travels in the token so the proxy can renew it. */
export function unlockToken(userId: string, sessionId: string, minutes: number, now = Date.now()) {
  const span = Math.max(1, Math.floor(minutes));
  const expires = Math.floor(now / 1000) + span * 60;
  return `${expires}.${span}.${sign(userId, sessionId, expires, span)}`;
}

/** The token's lock period when it is this person's, for this session, and not expired; otherwise null. */
export function readUnlockToken(value: string | undefined, userId: string, sessionId: string, now = Date.now()): number | null {
  if (!value) return null;
  const [expiresText, minutesText, mac] = value.split(".");
  const expires = Number(expiresText);
  const minutes = Number(minutesText);
  if (!Number.isSafeInteger(expires) || !Number.isSafeInteger(minutes) || minutes < 1 || !mac || expires * 1000 <= now) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(userId, sessionId, expires, minutes));
  return a.byteLength === b.byteLength && timingSafeEqual(a, b) ? minutes : null;
}

export function unlockTokenValid(value: string | undefined, userId: string, sessionId: string, now = Date.now()) {
  return readUnlockToken(value, userId, sessionId, now) !== null;
}

export const unlockCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
