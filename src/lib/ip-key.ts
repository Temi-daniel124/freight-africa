import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { homePath } from "@/lib/hosts";

/**
 * A keyed hash of the caller's internet address, for rate limits only. The address itself is never
 * stored (privacy notice: "we keep a scrambled version of your internet address for one day").
 */
export async function ipKey(): Promise<string> {
  const ip = (await requestIp()) ?? "unknown";
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`rate-limit:${ip}`).digest("hex");
}

/** The caller's internet address, for a check made during this request only. Never stored or logged. */
export async function requestIp(): Promise<string | null> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
}

/** The address this request came in on (https://freight-africa.com, a preview URL, or localhost). */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "freight-africa.com";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${requestHeaders.get("x-forwarded-proto") || (local ? "http" : "https")}://${host}`;
}

/** Where a signed-in person lands on the host this request came in on (D033). */
export async function requestHome(): Promise<string> {
  const requestHeaders = await headers();
  return homePath(requestHeaders.get("host") || requestHeaders.get("x-forwarded-host") || "");
}
