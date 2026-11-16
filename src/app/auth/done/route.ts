import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_NEXT } from "@/features/auth/next-path";
import { clearPendingCode, readPendingCode } from "@/features/auth/pending";
import { supabaseServer } from "@/lib/supabase/server";

// The last step of A-02: the code was right, so forget where it was sent and open the app.
// The return path comes from the signed cookie, never from the address bar.
export async function GET(request: NextRequest) {
  const { data } = await (await supabaseServer()).auth.getClaims();
  if (!data?.claims) return NextResponse.redirect(new URL("/auth", request.nextUrl.origin));

  const next = (await readPendingCode())?.next ?? DEFAULT_NEXT;
  await clearPendingCode();
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
