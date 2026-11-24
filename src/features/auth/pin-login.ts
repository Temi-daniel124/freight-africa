import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { safeNext } from "./next-path";
import { parseLogin } from "./login-name";

export { parseLogin };

// D044 sign-in on a new device: between "Continue" (email or phone) and the PIN keypad, the sign-in name
// waits in a short-lived, signed, server-only cookie, never in the URL.

const COOKIE = "fa_pin_login";
const MINUTES = 15;

export type PinLogin = { kind: "email" | "phone"; login: string; next: string };

function mac(body: string) {
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`pin-login:${body}`).digest("base64url");
}

export async function setPinLogin(value: PinLogin) {
  const body = Buffer.from(JSON.stringify({ ...value, at: Date.now() })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${mac(body)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth", maxAge: MINUTES * 60 });
}

export async function readPinLogin(home = "/app"): Promise<PinLogin | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [body, signature] = raw.split(".");
  if (!body || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(mac(body));
  if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString()) as PinLogin & { at: number };
    if (typeof value.at !== "number" || Date.now() - value.at > MINUTES * 60_000) return null;
    const parsed = parseLogin(value.kind === "phone" ? `+${value.login}` : value.login);
    if (!parsed || parsed.login !== value.login) return null;
    return { ...parsed, next: safeNext(value.next, home) };
  } catch {
    return null;
  }
}

export async function clearPinLogin() {
  (await cookies()).delete({ name: COOKIE, path: "/auth" });
}
