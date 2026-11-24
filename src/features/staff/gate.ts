import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

/**
 * Where a person stands on the way into the staff console (ux-admin X-00; SECURITY.md §3):
 * - "enroll": staff, no authenticator yet → set one up (with backup codes);
 * - "verify": staff with an authenticator, signed in with the first step only → enter the code;
 * - "code": two-step done, staff code not yet agreed;
 * - "ready": in.
 * Signed-out people go to sign-in; signed-in people who aren't staff get "notStaff".
 */
export type StaffStep = "notStaff" | "enroll" | "verify" | "code" | "ready";
export type StaffGate = { step: StaffStep; role: StaffRole | null; name: string; email: string; factorId: string | null };

export const staffGate = cache(async (next = "/admin"): Promise<StaffGate> => {
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(`/auth?next=${encodeURIComponent(next)}`);
  const email = typeof claims.email === "string" ? claims.email : "";

  const [{ data: role }, { data: profile }, { data: factors }, { data: own }] = await Promise.all([
    supabase.rpc("my_staff_role"),
    supabase.from("profiles").select("full_name").eq("id", claims.sub).maybeSingle(),
    supabase.auth.mfa.listFactors(),
    supabase.from("staff_members").select("staff_code_accepted_at").eq("user_id", claims.sub).maybeSingle(),
  ]);
  const name = profile?.full_name?.trim() || email;
  if (!role) return { step: "notStaff", role: null, name, email, factorId: null };

  const verified = factors?.totp.find((factor) => factor.status === "verified") ?? null;
  if (!verified) return { step: "enroll", role, name, email, factorId: null };
  if (claims.aal !== "aal2") return { step: "verify", role, name, email, factorId: verified.id };
  if (!own?.staff_code_accepted_at) return { step: "code", role, name, email, factorId: verified.id };
  return { step: "ready", role, name, email, factorId: verified.id };
});

const STEP_PATHS: Record<Exclude<StaffStep, "ready">, string> = {
  notStaff: "/admin",
  enroll: "/admin/setup",
  verify: "/admin/verify",
  code: "/admin/staff-code",
};

/** For each setup screen: send the person to the step they're actually on, unless it's this one. */
export async function requireStaffStep(step: StaffStep, here: string): Promise<StaffGate> {
  const gate = await staffGate(here);
  if (gate.step === step) return gate;
  redirect(gate.step === "ready" ? "/admin/work" : STEP_PATHS[gate.step]);
}
