import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { TERMS_VERSION } from "@/features/onboarding/roles";
import { formatNigerianPhone } from "@/lib/phone";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import type { ShellConfig } from "./config";

/** Who is looking at the shell: what the top bar, sidebar and account menu show. */
export type Viewer = {
  firstName: string | null;
  fullName: string;
  /** The account the shell is acting for: the organisation, or the person until slice 4 adds organisations. */
  account: string;
  accountInitials: string;
  /** Under the person's name in the sidebar ("Owner · Okafor Foods Ltd"). */
  role: string;
  /** Email or phone, for "Signed in as". */
  contact: string;
  unread: number;
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "FA";
  // The first letters of the first two words: "Okafor Foods Ltd" is OF, "Adaeze Okafor" is AO.
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * The signed-in person, once per request. Sends anyone signed out to sign-in, and anyone who hasn't
 * chosen what they're joining as to the role step (A-03), so every shell page is safe to render.
 */
export const getViewer = cache(async (config: ShellConfig): Promise<Viewer> => {
  const next = config.base;
  await connection();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect(`/auth?next=${encodeURIComponent(next)}`);
  const { data: agreed } = await supabase.rpc("has_accepted_terms", { p_version: TERMS_VERSION });
  if (agreed !== true) redirect("/onboarding/role");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", claims.sub).maybeSingle();
  const email = typeof claims.email === "string" ? claims.email : "";
  const phone = typeof claims.phone === "string" && claims.phone ? `+234 ${formatNigerianPhone(claims.phone)}` : "";
  const contact = email || phone;
  const fullName = profile?.full_name?.trim() || contact || messages.shell.roles.shipper;
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? null;
  const role = messages.shell.roles[config.role];
  return { firstName, fullName, account: fullName, accountInitials: initials(fullName), role, contact, unread: 0 };
});

/** "Good morning" / "Good afternoon" / "Good evening", by the clock in Lagos (times are shown in Africa/Lagos). */
export function greetingFor(date: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(date));
  const g = messages.shell.greeting;
  return hour < 12 ? g.morning : hour < 17 ? g.afternoon : g.evening;
}
