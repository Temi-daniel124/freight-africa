import { NextResponse, type NextRequest } from "next/server";
import { clearCodeProof, hasCodeProof } from "@/features/auth/code-proof-cookie";
import { clearPendingCode, readPendingCode } from "@/features/auth/pending";
import { NEW_PIN_COOKIE } from "@/features/auth/pin-cookies";
import { finishSignIn, mustChoosePin } from "@/features/auth/pin-session";
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
  // Only straight after a confirmed code in this session (review of #85): a live session alone, such as
  // a phone that locked itself, must not open the app here without the PIN.
  const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
  if (!sessionId || !(await hasCodeProof(claims.sub, sessionId))) {
    return NextResponse.redirect(new URL("/auth/unlock", request.nextUrl.origin));
  }

  const next = (await readPendingCode())?.next ?? (await requestHome());
  await clearPendingCode();
  const email = typeof claims.email === "string" ? claims.email : null;

  // Two-step on: the authenticator code first; the device is recorded and the app opened only after it.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return NextResponse.redirect(new URL(`/auth/two-step?next=${encodeURIComponent(next)}`, request.nextUrl.origin));
  }
  const choosePin = await mustChoosePin(supabase, request.cookies.get(NEW_PIN_COOKIE)?.value === "1");
  await finishSignIn(claims.sub, sessionId, email, !choosePin);
  if (choosePin) {
    // The proof stays for Choose a PIN, which needs it to replace an existing PIN.
    return NextResponse.redirect(new URL(`/auth/pin/new?next=${encodeURIComponent(next)}`, request.nextUrl.origin));
  }
  await clearCodeProof();
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
