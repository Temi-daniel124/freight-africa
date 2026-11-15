import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

// Server-only client with the secret key: it bypasses RLS, so it is used only through
// database functions that do their own checks (SECURITY.md section 2.1).
export function supabaseAdmin() {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
