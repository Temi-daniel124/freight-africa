import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readUnlockToken, UNLOCK_COOKIE, unlockCookieOptions, unlockToken } from "@/features/auth/unlock-token";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Signed-in areas. The public launch pages never run this, so they stay static and fast.
const SESSION_PREFIXES = ["/app", "/admin", "/auth", "/onboarding", "/invite"];

export function needsSession(pathname: string) {
  return SESSION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Refreshes the Supabase session before the page renders; the response carries any new cookies. */
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = publicEnv();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });
  // getClaims verifies the token's signature and refreshes it when it has expired.
  const { data } = await supabase.auth.getClaims();
  // D044: while the app is in use its lock period slides forward; unused for that long, it locks.
  const claims = data?.claims;
  if (claims && typeof claims.session_id === "string") {
    const minutes = readUnlockToken(request.cookies.get(UNLOCK_COOKIE)?.value, claims.sub, claims.session_id);
    if (minutes !== null) response.cookies.set(UNLOCK_COOKIE, unlockToken(claims.sub, claims.session_id, minutes), unlockCookieOptions);
  }
  return response;
}
