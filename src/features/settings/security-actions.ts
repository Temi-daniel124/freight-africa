"use server";

import { redirect } from "next/navigation";
import { assertUnlocked } from "@/features/auth/unlock";
import { supabaseServer } from "@/lib/supabase/server";

export type ChangePinResult = { status: "ok" | "wrong" | "locked" | "weak" | "error" };

/** Settings, Change PIN (D044): the current PIN, then the new one. */
export async function changePin(oldPin: string, newPin: string): Promise<ChangePinResult> {
  await assertUnlocked();
  const { data, error } = await (await supabaseServer()).rpc("change_app_pin", { p_old: oldPin, p_new: newPin });
  if (error) return { status: "error" };
  return { status: data === "ok" || data === "wrong" || data === "locked" || data === "weak" ? data : "error" };
}

/** Settings, Turn off two-step sign-in: needs the two-step session (aal2) the person signed in with. */
export async function turnOffTwoStep(): Promise<{ status: "ok" | "error" }> {
  await assertUnlocked();
  const supabase = await supabaseServer();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: staff } = await supabase.rpc("my_staff_role");
  if (staff || aal?.currentLevel !== "aal2") return { status: "error" };
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.totp ?? []) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { status: "error" };
  }
  return { status: "ok" };
}

/** Settings, Sign out everywhere: every device, this one included. */
export async function signOutEverywhere(): Promise<void> {
  await (await supabaseServer()).auth.signOut({ scope: "global" });
  redirect("/auth?mode=signin");
}
