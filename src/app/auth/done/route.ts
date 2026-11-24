import { NextResponse, type NextRequest } from "next/server";
import { clearPendingCode, readPendingCode } from "@/features/auth/pending";
import { NEW_PIN_COOKIE } from "@/features/auth/pin-cookies";
import { finishSignIn } from "@/features/auth/pin-session";
import { requestHome } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";

// The last step of A-02: the email code was right. Remember this device (and email the person if it is
// a new one), then: no PIN yet, a forgotten PIN, or PIN sign-in locked → choose a PIN (A-11, D044);
// otherwise open the app. The return path comes from the signed cookie, never from the address bar.
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return NextResponse.redirect(new URL("/auth", request.nextUrl.origin));

  const next = (await readPendingCode())?.next ?? (await requestHome());
  await clearPendingCode();
  if (typeof claims.session_id === "string") await finishSignIn(claims.sub, claims.session_id, typeof claims.email === "string" ? claims.email : null);

  const [{ data: has }, { data: locked }] = await Promise.all([supabase.rpc("has_app_pin"), supabase.rpc("my_pin_locked")]);
  const wantsNew = request.cookies.get(NEW_PIN_COOKIE)?.value === "1";
  if (has !== true || locked === true || wantsNew) {
    return NextResponse.redirect(new URL(`/auth/pin/new?next=${encodeURIComponent(next)}`, request.nextUrl.origin));
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return NextResponse.redirect(new URL(`/auth/two-step?next=${encodeURIComponent(next)}`, request.nextUrl.origin));
  }
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
