import { createHmac, timingSafeEqual } from "node:crypto";

// D044: "Not you? Lock your account". A signed link for one account, valid for 7 days. Opening it shows
// a page with one button (email scanners that open links never lock anyone).

const DAYS = 7;

function secret() {
  const value = process.env.CODE_HMAC_SECRET;
  if (!value) throw new Error("CODE_HMAC_SECRET is not set");
  return value;
}

function sign(userId: string, expires: number) {
  return createHmac("sha256", secret()).update(`lock-account:${userId}:${expires}`).digest("hex");
}

export function lockLinkToken(userId: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + DAYS * 86400;
  return `${userId}.${expires}.${sign(userId, expires)}`;
}

/** The account id when the token is genuine and in date; otherwise null. */
export function readLockLinkToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [userId, expiresText, mac] = token.split(".");
  const expires = Number(expiresText);
  if (!userId || !/^[0-9a-f-]{36}$/.test(userId) || !Number.isSafeInteger(expires) || !mac || expires * 1000 <= now) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(userId, expires));
  return a.byteLength === b.byteLength && timingSafeEqual(a, b) ? userId : null;
}
