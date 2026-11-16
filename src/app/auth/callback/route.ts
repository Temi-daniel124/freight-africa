import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/features/auth/next-path";
import { supabaseServer } from "@/lib/supabase/server";

// Google sends the person back here with a one-time code; exchanging it signs them in (A-01).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    console.error("google callback failed", error.code ?? error.status);
  }
  return NextResponse.redirect(new URL("/auth?error=google", request.nextUrl.origin));
}
