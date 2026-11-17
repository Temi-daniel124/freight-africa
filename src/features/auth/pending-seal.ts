import { createHmac, timingSafeEqual } from "node:crypto";
import { safeNext } from "./next-path";
import { parseDestination, type CodeChannel } from "./schema";

/** A code that is on its way. `length` is how many digits it has (it follows the Supabase project setting). */
export type PendingCode = { channel: CodeChannel; to: string; next: string; length: number; sentAt?: number };

/** How long a code works (Supabase Auth setting, scripts/configure-auth-settings.mjs). */
export const CODE_MINUTES = 10;

/** True once the code that was sent can no longer work. */
export function codeExpired(pending: PendingCode, now: number = Date.now()) {
  return typeof pending.sentAt === "number" && now - pending.sentAt > CODE_MINUTES * 60_000;
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(`auth-pending:${payload}`).digest("base64url");

/**
 * The cookie value: the details plus a signature made with a server secret. The browser holds it but
 * can't change it, so nobody can point a code check at a different address, or respell their own address
 * ("Ngozi@…" for "ngozi@…") to get a fresh count of wrong tries.
 */
export function sealPending(pending: PendingCode, secret: string): string {
  const payload = Buffer.from(JSON.stringify(pending)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** The details from a cookie value, or null when it is missing, damaged or was not signed by us. */
export function openPending(value: string | undefined, secret: string): PendingCode | null {
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<PendingCode>;
    if (data.channel !== "email" && data.channel !== "whatsapp") return null;
    if (typeof data.to !== "string" || typeof data.next !== "string") return null;
    // Belt and braces: the address must already be in its one normal form, and the return path is
    // checked again on the way back in.
    if (parseDestination(data.channel, data.to) !== data.to) return null;
    const length = typeof data.length === "number" && Number.isInteger(data.length) && data.length >= 6 && data.length <= 10 ? data.length : 6;
    const sentAt = typeof data.sentAt === "number" && Number.isFinite(data.sentAt) ? data.sentAt : undefined;
    return { channel: data.channel, to: data.to, next: safeNext(data.next), length, ...(sentAt === undefined ? {} : { sentAt }) };
  } catch {
    return null;
  }
}
