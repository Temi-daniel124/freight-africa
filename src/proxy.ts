import { NextResponse, type NextRequest } from "next/server";
import { cleanSource, SOURCE_COOKIE } from "@/features/waitlist/source";

// Runs only for requests that carry a share-link name (see config.matcher), so ordinary visits to the
// launch page never wait for it.
export function proxy(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const source = cleanSource(params.get("ref")) ?? cleanSource(params.get("utm_source"));
  const response = NextResponse.next();
  if (source) {
    // Session cookie: no expiry, gone when the browser closes. Readable only by our server.
    response.cookies.set(SOURCE_COOKIE, source, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  }
  return response;
}

// Pages only (no file extension, no _next or api), and only when the link carries a name. Next reads this
// at build time, so the patterns must be written out in full.
export const config = {
  matcher: [
    { source: "/((?!_next/|api/)[^.]*)", has: [{ type: "query", key: "ref" }] },
    { source: "/((?!_next/|api/)[^.]*)", has: [{ type: "query", key: "utm_source" }] },
  ],
};
