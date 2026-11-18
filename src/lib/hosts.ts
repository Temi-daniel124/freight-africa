// D033: three hosts, one deployment. The public website, the signed-in app and the staff console each
// live on their own host, so each has its own cookies and a staff session never travels with the app's.
export const SITE_HOST = "freight-africa.com";
export const APP_HOST = "app.freight-africa.com";
export const ADMIN_HOST = "admin.freight-africa.com";

export const SITE_ORIGIN = `https://${SITE_HOST}`;
export const APP_ORIGIN = `https://${APP_HOST}`;
export const ADMIN_ORIGIN = `https://${ADMIN_HOST}`;

export type HostRoute = { kind: "pass" } | { kind: "redirect"; to: string } | { kind: "robots" };

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
// Files every host serves itself: Next's own assets, API routes, and anything with a file extension
// (fonts, images, icons, the web app manifest). Checked only after the signed-in areas, so a page such
// as /admin/trips/abc.1 is never mistaken for a file.
const shared = (pathname: string) => under(pathname, "/_next") || under(pathname, "/api") || /\.[a-z0-9]+$/i.test(pathname);

/** The host name alone: lower case, no port, no trailing dot. */
const hostName = (host: string) => host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

/** Where a signed-in person lands on this host: the staff console on the admin host, the app elsewhere. */
export function homePath(host: string) {
  return hostName(host) === ADMIN_HOST ? "/admin" : "/app";
}

/**
 * Where a request belongs. Only the three production hosts are sorted; preview deployments and
 * localhost serve every path on one host, so they keep working unchanged.
 * `rest` is the path plus query string, kept on redirects.
 */
export function hostRoute(host: string, pathname: string, rest: string = pathname): HostRoute {
  const name = hostName(host);
  const pass: HostRoute = { kind: "pass" };
  const to = (origin: string, path = rest): HostRoute => ({ kind: "redirect", to: `${origin}${path}` });

  if (name === SITE_HOST || name === `www.${SITE_HOST}`) {
    if (under(pathname, "/app") || under(pathname, "/auth") || under(pathname, "/onboarding")) return to(APP_ORIGIN);
    if (under(pathname, "/admin")) return to(ADMIN_ORIGIN);
    return pass;
  }

  if (name === APP_HOST || name === ADMIN_HOST) {
    const admin = name === ADMIN_HOST;
    // Signed-in hosts are never indexed.
    if (pathname === "/robots.txt") return { kind: "robots" };
    if (pathname === "/sitemap.xml") return to(SITE_ORIGIN);
    // Each host has its own sign-in, because cookies stay on the host that set them.
    if (under(pathname, "/auth")) return pass;
    if (under(pathname, "/admin")) return admin ? pass : to(ADMIN_ORIGIN);
    if (under(pathname, "/app") || under(pathname, "/onboarding")) return admin ? to(APP_ORIGIN) : pass;
    if (shared(pathname)) return pass;
    if (pathname === "/") return to(admin ? ADMIN_ORIGIN : APP_ORIGIN, admin ? "/admin" : "/app");
    // Everything else (launch page, waitlist, legal pages) belongs to the public website.
    return to(SITE_ORIGIN);
  }

  return pass;
}

/**
 * A link to the public website from a signed-in page. In production that is another host; on previews
 * and localhost everything is one host, so the path alone is right.
 */
export function siteHref(path: string = "/") {
  return process.env.VERCEL_ENV === "production" ? `${SITE_ORIGIN}${path}` : path;
}

/** A link into the app (sign-in) from the public website: another host in production, a path elsewhere. */
export function appHref(path: string = "/auth") {
  return process.env.VERCEL_ENV === "production" ? `${APP_ORIGIN}${path}` : path;
}
