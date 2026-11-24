"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ipKey } from "@/lib/ip-key";
import { supabaseServer } from "@/lib/supabase/server";
import { agentsEnabled, parseJoined, parseJoiningAs, shellFor, TERMS_VERSION, type Joined, type RoleState } from "./roles";

/** A-03: saves the agreements (F-10) and the choice, then opens that role's app, where Home shows what's left to set up. */
export async function chooseRole(previous: RoleState, formData: FormData): Promise<RoleState> {
  const attempt = previous.attempt + 1;
  const picked = parseJoiningAs(formData.get("role"));
  const role = picked === "agent" && !agentsEnabled() ? null : picked;
  const values = {
    role,
    terms: formData.get("terms") === "on",
    whatsapp: formData.get("whatsapp") === "on",
    marketing: formData.get("marketing") === "on",
  };
  const missing = { role: role === null, terms: !values.terms, whatsapp: !values.whatsapp };
  if (missing.role || missing.terms || missing.whatsapp) return { status: "invalid", missing, values, attempt };

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/auth?next=/onboarding/role");

  // Someone coming back to this step has already agreed; their answers are not recorded twice.
  const { data: accepted, error: checkError } = await supabase.rpc("has_accepted_terms", { p_version: TERMS_VERSION });
  if (checkError) {
    console.error("has_accepted_terms failed", checkError.code);
    return { status: "error", missing, values, attempt };
  }
  if (!accepted) {
    const { error } = await supabase.rpc("give_onboarding_consents", {
      p_version: TERMS_VERSION,
      p_marketing: values.marketing,
      p_ip_key: await ipKey(),
      p_user_agent: ((await headers()).get("user-agent") ?? "").slice(0, 512),
    });
    if (error) {
      console.error("give_onboarding_consents failed", error.code);
      return { status: "error", missing, values, attempt };
    }
  }
  // An owner-driver picking "I own trucks" again stays an owner-driver (that choice is made in the owner setup).
  const { data: profile } = await supabase.from("profiles").select("joining_as").eq("id", claims.claims.sub).maybeSingle();
  const joined: Joined = role === null ? "shipper" : role === "owner" && parseJoined(profile?.joining_as) === "owner_driver" ? "owner_driver" : role;
  const { error: saveError } = await supabase.from("profiles").update({ joining_as: joined }).eq("id", claims.claims.sub);
  if (saveError) {
    console.error("saving joining_as failed", saveError.code);
    return { status: "error", missing, values, attempt };
  }
  redirect(shellFor(joined));
}
