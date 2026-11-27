"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { normaliseNigerianPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabase/server";

async function me() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return { supabase, id: (data?.claims?.sub as string | undefined) ?? null };
}

/** DV32 Dark screen at night, kept on the profile too so it follows the driver to a new phone. */
export async function saveNightLook(mode: "auto" | "always" | "never"): Promise<void> {
  await assertUnlocked();
  const { supabase, id } = await me();
  if (!id) return;
  await supabase.from("profiles").update({ night_look: mode === "always" ? "on" : mode === "never" ? "off" : "auto" }).eq("id", id);
}

/** DV06 Emergency contact (optional): a name and a Nigerian mobile number, or both cleared. */
export async function saveEmergencyContact(name: string, phone: string): Promise<{ status: "ok" | "phone" | "error" }> {
  await assertUnlocked();
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80);
  const e164 = phone.trim() ? normaliseNigerianPhone(phone) : null;
  if (phone.trim() && !e164) return { status: "phone" };
  const { supabase, id } = await me();
  if (!id) return { status: "error" };
  const { error } = await supabase.from("profiles").update({ emergency_contact_name: clean || null, emergency_contact_phone: clean ? e164 : null }).eq("id", id);
  return { status: error ? "error" : "ok" };
}
