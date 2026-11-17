import { NextResponse, type NextRequest } from "next/server";
import { cleanSource, SOURCE_COOKIE } from "@/features/waitlist/source";
import { hostRoute } from "@/lib/hosts";
import { applySignedInHeaders } from "@/lib/security-headers";
import { needsSession, refreshSession } from "@/lib/supabase/session";

// Three jobs, each limited by config.matcher so ordinary visits to the launch page skip the proxy:
// 1. Hosts (D033): the app lives on app.freight-africa.com and the staff console on
//    admin.freight-africa.com; paths on the wrong host are redirected to the right one.
// 2. Signed-in areas (/app, /admin, /auth, /onboarding): refresh the Supabase session before the page renders,
//    and send the security headers.
// 3. Share links (?ref= or ?utm_source=): remember the link's name for the waitlist.
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";

  const route = hostRoute(host, pathname, `${pathname}${search}`);
  if (route.kind === "redirect") return NextResponse.redirect(route.to, 308);
  if (route.kind === "robots") {
    return new NextResponse("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const signedIn = needsSession(pathname);
  const response = signedIn ? await refreshSession(request) : NextResponse.next();
  if (signedIn) applySignedInHeaders(response.headers);

  const source = cleanSource(searchParams.get("ref")) ?? cleanSource(searchParams.get("utm_source"));
  if (source) {
    // Session cookie: no expiry, gone when the browser closes. Readable only by our server, and only
    // on the host that set it (no Domain attribute).
    response.cookies.set(SOURCE_COOKIE, source, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  return response;
}

// Next reads this at build time, so the patterns must be written out in full.
export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/auth/:path*",
    "/onboarding/:path*",
    { source: "/((?!_next/|api/)[^.]*)", has: [{ type: "query", key: "ref" }] },
    { source: "/((?!_next/|api/)[^.]*)", has: [{ type: "query", key: "utm_source" }] },
    // Every path on the two signed-in hosts, so pages that belong elsewhere are redirected.
    { source: "/((?!_next/).*)", has: [{ type: "host", value: "app.freight-africa.com" }] },
    { source: "/((?!_next/).*)", has: [{ type: "host", value: "admin.freight-africa.com" }] },
  ],
};
