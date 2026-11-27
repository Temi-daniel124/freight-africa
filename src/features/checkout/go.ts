/** Our own paths ("/app/…", never "//host") or an https page (D048 review). */
export function safeCheckoutUrl(url: string) {
  return /^\/[^/\]/.test(url) || /^https:\/\/[^/]/.test(url);
}

/** Off to a checkout page. The URL always comes from our database; this is a second guard. */
export function goToCheckout(url: string) {
  if (safeCheckoutUrl(url)) window.location.assign(url);
}
