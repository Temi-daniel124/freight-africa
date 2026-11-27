/**
 * Off to a checkout page (D048): only our own paths ("/app/…", never "//host") or an https page; the
 * URL always comes from our database, this is a second guard (review).
 */
export function goToCheckout(url: string) {
  if (/^\/[^/\]/.test(url) || /^https:\/\/[^/]/.test(url)) window.location.assign(url);
}
