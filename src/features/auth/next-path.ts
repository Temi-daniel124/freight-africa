// Where to go after signing in. Only paths on this site are allowed, so a link like
// /auth?next=https://evil.example can't send someone away after they sign in (open redirect).
export const DEFAULT_NEXT = "/app";

const SITE = "https://freight-africa.com";

/** True for a plain path on this site: one leading slash, no backslash, no control characters. */
function isLocalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\u0000-\u001f\u007f]/.test(value);
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !isLocalPath(value)) return DEFAULT_NEXT;
  try {
    const url = new URL(value, SITE);
    if (url.origin !== SITE) return DEFAULT_NEXT;
    // The browser will read the normalised form, so that is what gets checked: "/a/..//evil.example"
    // normalises to "//evil.example", which a browser treats as another site.
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!isLocalPath(path)) return DEFAULT_NEXT;
    // Never bounce back into sign-in itself.
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return DEFAULT_NEXT;
    return path;
  } catch {
    return DEFAULT_NEXT;
  }
}
