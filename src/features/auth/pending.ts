import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { safeNext } from "./next-path";
import type { CodeChannel } from "./schema";

// Between "Send code" and "Enter code" we remember where the code went in a short-lived, server-only
// cookie, so the phone number or email never appears in a URL.
const PENDING_COOKIE = "fa_auth_pending";
const PENDING_MINUTES = 15;

/** `length` is how many digits the code has (it follows the Supabase project setting). */
export type PendingCode = { channel: CodeChannel; to: string; next: string; length: number };

export async function setPendingCode(pending: PendingCode) {
  (await cookies()).set(PENDING_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: PENDING_MINUTES * 60,
  });
}

export async function readPendingCode(): Promise<PendingCode | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCode>;
    if ((value.channel === "email" || value.channel === "whatsapp") && typeof value.to === "string" && typeof value.next === "string") {
      const length = Number.isInteger(value.length) && value.length! >= 6 && value.length! <= 10 ? value.length! : 6;
      // The cookie lives in the browser, so its return path is checked again on the way back in.
      return { channel: value.channel, to: value.to, next: safeNext(value.next), length };
    }
  } catch {
    // A damaged cookie is treated as no cookie.
  }
  return null;
}

export async function clearPendingCode() {
  (await cookies()).delete({ name: PENDING_COOKIE, path: "/auth" });
}

/** The key the database counts codes under: an HMAC, so the table never holds a phone or email. */
export function codeKey(channel: CodeChannel, to: string) {
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`sign-in:${channel}:${to}`).digest("hex");
}
