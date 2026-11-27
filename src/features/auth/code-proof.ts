import { createHmac, timingSafeEqual } from "node:crypto";

// Proof that an email code was just confirmed in this sign-in session (independent review of #85).
// The verify-code action sets it after Supabase accepts the code; /auth/done needs it before it opens
// the app, and choosing a new PIN over an existing one needs it too. Without it, anyone holding a live
// session (a borrowed phone that has locked itself) could open the app by visiting /auth/done, or
// replace a locked PIN, without the PIN or a code. Signed for one person and one session, 10 minutes.

export const CODE_PROOF_COOKIE = "fa_code_ok";
export const CODE_PROOF_MINUTES = 10;

function sign(userId: string, sessionId: string, expires: number, secret: string) {
  return createHmac("sha256", secret).update(`code-proof:${userId}:${sessionId}:${expires}`).digest("hex");
}

export function codeProof(userId: string, sessionId: string, secret: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + CODE_PROOF_MINUTES * 60;
  return `${expires}.${sign(userId, sessionId, expires, secret)}`;
}

export function codeProofValid(value: string | undefined, userId: string, sessionId: string, secret: string, now = Date.now()) {
  if (!value) return false;
  const [expiresText, mac] = value.split(".");
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || !mac || expires * 1000 <= now) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(userId, sessionId, expires, secret));
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}
