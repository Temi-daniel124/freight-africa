// Only the real browser push services, so the server never sends a request to an address someone typed
// in (security review: SSRF). Checked when a device is saved and again before every send.
const EXACT = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);
const SUFFIX = [".notify.windows.com", ".push.apple.com"];

export function isPushEndpoint(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || raw.length > 1000) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  return EXACT.has(host) || SUFFIX.some((s) => host.endsWith(s));
}
