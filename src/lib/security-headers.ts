import { publicEnv } from "@/lib/env";

/**
 * Content-Security-Policy for the signed-in areas (/auth, /app, /admin) on every host (SECURITY.md §9).
 * The public launch pages are static and are not touched here.
 * Scripts still allow inline code because Next's partly pre-rendered pages can't carry a per-request
 * nonce; moving to nonces is tracked in docs/PROJECT-STATE.md.
 */
// The bot check on "Send code" loads its script and its frame from Cloudflare.
const TURNSTILE = "https://challenges.cloudflare.com";

export function signedInCsp(): string {
  const supabase = new URL(publicEnv().NEXT_PUBLIC_SUPABASE_URL);
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${TURNSTILE}${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Signed links to private photos (ID checks, papers) come from Supabase Storage.
    `img-src 'self' data: blob: ${supabase.origin}`,
    "font-src 'self'",
    `connect-src 'self' ${supabase.origin} wss://${supabase.host}${dev ? " ws:" : ""}`,
    "worker-src 'self' blob:",
    `frame-src ${TURNSTILE}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // Google sign-in leaves through a form post that redirects to Supabase and then Google.
    `form-action 'self' ${supabase.origin} https://accounts.google.com`,
  ].join("; ");
}

export function applySignedInHeaders(headers: Headers) {
  headers.set("Content-Security-Policy", signedInCsp());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(self), geolocation=(self), microphone=(), payment=()");
  headers.set("X-Robots-Tag", "noindex, nofollow");
}
