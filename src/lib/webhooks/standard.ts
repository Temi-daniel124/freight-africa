import { createHmac, timingSafeEqual } from "node:crypto";

// Standard Webhooks signature check (standardwebhooks.com), used by Supabase Auth hooks.
// The signed text is "<id>.<timestamp>.<raw body>", HMAC-SHA256 with the base64 secret after "whsec_".
const TOLERANCE_SECONDS = 5 * 60;

export type SignedHeaders = { id: string | null; timestamp: string | null; signature: string | null };

export function verifyStandardWebhook(rawBody: string, headers: SignedHeaders, secret: string, now = Date.now()): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Old or future-dated messages are refused, so a captured request can't be replayed later.
  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || Math.abs(now / 1000 - sentAt) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  // The header may carry several signatures ("v1,<base64> v1,<base64>") while a secret is being rotated.
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
