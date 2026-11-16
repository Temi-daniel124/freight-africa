// Where to go after signing in. Only paths on this site are allowed, so a link like
// /auth?next=https://evil.example can't send someone away after they sign in (open redirect).
export const DEFAULT_NEXT = "/app";

const SITE = "https://freight-africa.com";

/** True for a plain path on this site: one leading slash, no backslash, no control characters. */
function isLocalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u001f\u007f]/.test(value);
}

/** `fallback` is the host's home: /app, or /admin on the staff host (D033). */
export function safeNext(value: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  if (!value || !isLocalPath(value)) return fallback;
  try {
    const url = new URL(value, SITE);
    if (url.origin !== SITE) return fallback;
    // The browser will read the normalised form, so that is what gets checked: "/a/..//evil.example"
    // normalises to "//evil.example", which a browser treats as another site.
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!isLocalPath(path)) return fallback;
    // Never bounce back into sign-in itself.
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
