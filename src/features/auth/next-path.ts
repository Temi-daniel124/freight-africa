// Where to go after signing in. Only paths on this site are allowed, so a link like
// /auth?next=https://evil.example can't send someone away after they sign in (open redirect).
export const DEFAULT_NEXT = "/app";

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_NEXT;
  if (/[\u0000-\u001f]/.test(value)) return DEFAULT_NEXT;
  try {
    const url = new URL(value, "https://freight-africa.com");
    if (url.origin !== "https://freight-africa.com") return DEFAULT_NEXT;
    // Never bounce back into sign-in itself.
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}
