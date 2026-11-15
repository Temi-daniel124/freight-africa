import { NextResponse, type NextRequest } from "next/server";
import { cleanSource, SOURCE_COOKIE } from "@/features/waitlist/source";
import { needsSession, refreshSession } from "@/lib/supabase/session";

// Two jobs, each limited by config.matcher so ordinary visits to the launch page skip the proxy:
// 1. Signed-in areas (/app, /admin, /auth): refresh the Supabase session before the page renders.
// 2. Share links (?ref= or ?utm_source=): remember the link's name for the waitlist.
export async function proxy(request: NextRequest) {
  const response = needsSession(request.nextUrl.pathname) ? await refreshSession(request) : NextResponse.next();

  const params = request.nextUrl.searchParams;
  const source = cleanSource(params.get("ref")) ?? cleanSource(params.get("utm_source"));
  if (source) {
    // Session cookie: no expiry, gone when the browser closes. Readable only by our server.
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
    { source: "/((?!_next/|api/)[^.]*)", has: [{ type: "query", key: "ref" }] },
    { source: "/((?!_next/|api/)[^.]*)", has: [{ type: "query", key: "utm_source" }] },
  ],
};
