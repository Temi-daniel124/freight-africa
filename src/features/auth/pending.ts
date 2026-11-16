import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { openPending, sealPending, type PendingCode } from "./pending-seal";
import type { CodeChannel } from "./schema";

// Between "Send code" and "Enter code" we remember where the code went in a short-lived, server-only,
// signed cookie, so the phone number or email never appears in a URL and can't be swapped in the browser.
const PENDING_COOKIE = "fa_auth_pending";
// Matches how long a code lasts (Supabase Auth: 10 minutes, scripts/configure-auth-settings.mjs).
const PENDING_MINUTES = 10;

export type { PendingCode };

export async function setPendingCode(pending: PendingCode) {
  (await cookies()).set(PENDING_COOKIE, sealPending(pending, serverEnv().CODE_HMAC_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: PENDING_MINUTES * 60,
  });
}

export async function readPendingCode(): Promise<PendingCode | null> {
  return openPending((await cookies()).get(PENDING_COOKIE)?.value, serverEnv().CODE_HMAC_SECRET);
}

export async function clearPendingCode() {
  (await cookies()).delete({ name: PENDING_COOKIE, path: "/auth" });
}

/** The key the database counts codes under: an HMAC, so the table never holds a phone or email. */
export function codeKey(channel: CodeChannel, to: string) {
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`sign-in:${channel}:${to}`).digest("hex");
}
