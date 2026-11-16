import "server-only";

// Cloudflare Turnstile: a free check that the visitor is a person, invisible unless Cloudflare is unsure.
// It is on only when both keys are set, so the app works unchanged until the founder creates the widget.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileSiteKey(): string | null {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return siteKey && process.env.TURNSTILE_SECRET_KEY ? siteKey : null;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/**
 * True when Turnstile is off, or when Cloudflare confirms the token. A token works once and for five
 * minutes, so each "Send code" needs a fresh one. Cloudflare being unreachable counts as a failed check:
 * the person is asked to try again rather than let through unchecked.
 */
export async function passesTurnstile(token: string, ip: string | null, fetcher: Fetcher = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSiteKey() || !secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const response = await fetcher(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    console.error("turnstile check failed to complete");
    return false;
  }
}
