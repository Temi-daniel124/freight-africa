import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";

/**
 * A keyed hash of the caller's internet address, for rate limits only. The address itself is never
 * stored (privacy notice: "we keep a scrambled version of your internet address for one day").
 */
export async function ipKey(): Promise<string> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  return createHmac("sha256", serverEnv().CODE_HMAC_SECRET).update(`rate-limit:${ip}`).digest("hex");
}

/** The address this request came in on (https://freight-africa.com, a preview URL, or localhost). */
export async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "freight-africa.com";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${requestHeaders.get("x-forwarded-proto") || (local ? "http" : "https")}://${host}`;
}
