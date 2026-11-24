import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { deviceLabel } from "./device-label";

export { deviceLabel };

// D044: a device is "known" by a random id in a signed, httpOnly cookie. The database keeps only a hash.

const DEVICE_COOKIE = "fa_device";
const YEAR = 60 * 60 * 24 * 400;

function mac(id: string) {
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`device:${id}`).digest("hex");
}

function readDeviceId(value: string | undefined): string | null {
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !/^[0-9a-f]{64}$/.test(id) || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(mac(id));
  return a.byteLength === b.byteLength && timingSafeEqual(a, b) ? id : null;
}

/** This device's id, creating the cookie on first use. Server actions and route handlers only. */
export async function deviceId(): Promise<string> {
  const jar = await cookies();
  const existing = readDeviceId(jar.get(DEVICE_COOKIE)?.value);
  if (existing) return existing;
  const id = randomBytes(32).toString("hex");
  jar.set(DEVICE_COOKIE, `${id}.${mac(id)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: YEAR });
  return id;
}

export function deviceHash(id: string) {
  return createHash("sha256").update(id).digest("hex");
}

/** The device's label and rough city (Vercel's location header; empty when unknown). */
export async function deviceContext() {
  const h = await headers();
  let city = "";
  try {
    city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "").slice(0, 80);
  } catch {
    city = "";
  }
  return { label: deviceLabel(h.get("user-agent") ?? ""), city };
}
